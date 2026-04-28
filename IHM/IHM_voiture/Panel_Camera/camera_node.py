import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from std_msgs.msg import Header
from cv_bridge import CvBridge
import cv2
import os

class CameraNode(Node):
    """
    Panel Camera — Publie :
      - /CAM_BACK/image_rect_compressed_downsampled : images KITTI (caméra extérieure)
      - /interior_image : flux webcam (caméra intérieure)
    """
    def __init__(self, current_frame_ref, file_list_ref):
        super().__init__('camera_node')

        self.exterior_pub = self.create_publisher(Image, '/CAM_BACK/image_rect_compressed_downsampled', 10)
        self.interior_pub = self.create_publisher(Image, 'interior_image', 10)

        self.bridge = CvBridge()
        self.image_dir = os.path.expanduser('~/test_lidar/images/')

        # Références partagées avec le nœud principal
        self.current_frame_ref = current_frame_ref
        self.file_list_ref = file_list_ref

        # Webcam
        self.cap = cv2.VideoCapture(0)
        if not self.cap.isOpened():
            self.get_logger().warning('Webcam non détectée.')

        self.get_logger().info('Panel Camera démarré.')

    def publish(self, header, filename):
        # Caméra extérieure (KITTI)
        image_name = filename.replace('.bin', '.png')
        image_path = os.path.join(self.image_dir, image_name)
        if os.path.exists(image_path):
            cv_image = cv2.imread(image_path)
            if cv_image is not None:
                img_msg = self.bridge.cv2_to_imgmsg(cv_image, encoding='bgr8')
                img_msg.header = header
                self.exterior_pub.publish(img_msg)

        # Caméra intérieure (webcam)
        if self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret:
                frame = cv2.resize(frame, (640, 480))
                img_msg_int = self.bridge.cv2_to_imgmsg(frame, encoding='bgr8')
                img_msg_int.header = header
                self.interior_pub.publish(img_msg_int)

    def destroy_node(self):
        if self.cap.isOpened():
            self.cap.release()
        super().destroy_node()

def main():
    rclpy.init()
    node = CameraNode(None, None)
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == '__main__':
    main()
