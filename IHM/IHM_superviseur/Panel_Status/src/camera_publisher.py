import rclpy
from rclpy.node import Node
from rclpy.executors import ExternalShutdownException
from sensor_msgs.msg import Image
from sensor_msgs.msg import CompressedImage
from sensor_msgs.msg import CameraInfo
from cv_bridge import CvBridge
import cv2
import sys


class CameraPublisher(Node):
    def __init__(self):
        super().__init__('usb_cam_node')

        # ── Parameters ────────────────────────────────────────────────────────────────
        self.declare_parameter('device', '/dev/video6')
        self.declare_parameter('fps', 30.0)
        self.declare_parameter('frame_id', 'camera_link')
        self.declare_parameter('topic', '/image_pour_le_s8')
        self.declare_parameter('jpeg_quality', 80)  # 0-100

        device       = self.get_parameter('device').value
        fps          = self.get_parameter('fps').value
        frame_id     = self.get_parameter('frame_id').value
        topic        = self.get_parameter('topic').value
        self._quality = self.get_parameter('jpeg_quality').value

        self._frame_id = frame_id
        self._bridge   = CvBridge()
        self._cap      = None

        # ── Publisher (CompressedImage) ───────────────────────────────────────────────
        compressed_topic = topic + '/compressed'
        self._pub = self.create_publisher(CompressedImage, compressed_topic, 10)
        self._pub_camera_info = self.create_publisher(CameraInfo, topic+"/camera_info", 10)

        # ── Open camera ───────────────────────────────────────────────────────────────
        self._open_camera(device)

        # ── Timer ─────────────────────────────────────────────────────────────────────
        self._timer = self.create_timer(1.0 / fps, self._timer_callback)

        self.get_logger().info(
            f"Camera node ready — device={device}  fps={fps}  "
            f"topic={compressed_topic}  jpeg_quality={self._quality}"
        )

    # ── Camera helpers ────────────────────────────────────────────────────────────────

    def _open_camera(self, device: str) -> None:
        cap = cv2.VideoCapture(device, cv2.CAP_V4L2)

        if not cap.isOpened():
            self.get_logger().error(f"Could not open {device}")
            cap.release()
            return

        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 1000)
        cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 1000)

        self._cap = cap
        self.get_logger().info(f"Opened {device}")

    def _release_camera(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None

    # ── Timer callback ────────────────────────────────────────────────────────────────

    def _timer_callback(self) -> None:
        if self._cap is None or not self._cap.isOpened():
            self.get_logger().warn("Camera not available — skipping frame", throttle_duration_sec=5.0)
            return

        ret, frame = self._cap.read()

        if not ret:
            self.get_logger().warn("Failed to capture frame", throttle_duration_sec=2.0)
            return

        # ── Compression JPEG ──────────────────────────────────────────────────────────
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, self._quality]
        success, buffer = cv2.imencode('.jpg', frame, encode_params)

        if not success:
            self.get_logger().warn("JPEG encoding failed — skipping frame", throttle_duration_sec=2.0)
            return

        msg = CompressedImage()
        msg.header.stamp    = self.get_clock().now().to_msg()
        msg.header.frame_id = self._frame_id
        msg.format          = 'jpeg'
        msg.data            = buffer.tobytes()

        # createion object Camera Info pour cette image 
        msg_cam_info = CameraInfo()
        msg_cam_info.header = msg.header
        msg_cam_info.height = frame.shape[0]
        msg_cam_info.width = frame.shape[1]
        msg_cam_info.distortion_model = 'plumb_bob'
        msg_cam_info.d = [0.0, 0.0, 0.0, 0.0, 0.0]
        msg_cam_info.k = [1.0, 0.0, float(frame.shape[1] / 2),
                        0.0, 1.0, float(frame.shape[0] / 2),
                        0.0, 0.0, 1.0]
        msg_cam_info.r = [1.0, 0.0, 0.0,
                        0.0, 1.0, 0.0,
                        0.0, 0.0, 1.0]
        msg_cam_info.p = [1.0, 0.0, float(frame.shape[1] / 2), 0.0,
                        0.0, 1.0, float(frame.shape[0] / 2), 0.0,
                        0.0, 0.0, 1.0,                        0.0]

        self._pub.publish(msg) 
        self._pub_camera_info.publish(msg_cam_info)

    # ── Lifecycle ─────────────────────────────────────────────────────────────────────

    def destroy_node(self) -> None:
        self.get_logger().info("Shutting down — releasing camera...")
        self._release_camera()
        super().destroy_node()


# ── Entry point ───────────────────────────────────────────────────────────────────────

def main(args=None):
    rclpy.init(args=args)
    node = CameraPublisher()

    try:
        rclpy.spin(node)
    except (KeyboardInterrupt, ExternalShutdownException):
        pass
    finally:
        node.destroy_node()
        rclpy.try_shutdown()


if __name__ == '__main__':
    main()