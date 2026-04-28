import rclpy
from rclpy.node import Node
from sensor_msgs.msg import PointCloud2, Image
from std_msgs.msg import Bool, Header, Int32, Float32
from visualization_msgs.msg import Marker, MarkerArray
import sensor_msgs_py.point_cloud2 as pc2
from cv_bridge import CvBridge
import cv2
import numpy as np
import os

class KittiPlayer(Node):
    def __init__(self):
        super().__init__('kitti_player')
        self.publisher_ = self.create_publisher(PointCloud2, 'kitti_cloud', 10)
        self.status_pub = self.create_publisher(Bool, 'blocking_movement', 10)
        self.count_pub = self.create_publisher(Int32, 'obstacle_points_count', 10)
        self.marker_pub = self.create_publisher(MarkerArray, 'detection_zone', 10)
        self.exterior_image_pub = self.create_publisher(Image, 'kitti_image', 10)
        self.interior_image_pub = self.create_publisher(Image, 'interior_image', 10)
        self.dist_pub = self.create_publisher(Float32, 'closest_obstacle_distance', 10)
        
        # Nouveau canal pour la batterie
        self.battery_pub = self.create_publisher(Float32, 'battery_level', 10)
        self.battery_level = 100.0 # La batterie démarre à 100%
        
        self.data_dir = os.path.expanduser('~/test_lidar/data/')
        self.image_dir = os.path.expanduser('~/test_lidar/images/')
        self.bridge = CvBridge()
        
        self.cap = cv2.VideoCapture(0)
        if not self.cap.isOpened():
            self.get_logger().warning("Webcam non détectée.")

        self.file_list = sorted([f for f in os.listdir(self.data_dir) if f.endswith('.bin')])
        self.current_frame = 0
        self.timer = self.create_timer(0.1, self.timer_callback)
        self.get_logger().info('Système IHM Vehicule - Gestion Énergie Active')

    def timer_callback(self):
        if len(self.file_list) == 0:
            return
        if self.current_frame >= len(self.file_list):
            self.current_frame = 0
        
        filename = self.file_list[self.current_frame]
        header = Header(frame_id='map', stamp=self.get_clock().now().to_msg())

        # --- GESTION DE LA BATTERIE ---
        # On simule une décharge de 0.05% à chaque cycle (environ 0.5% par seconde)
        self.battery_level -= 0.05 
        if self.battery_level < 0:
            self.battery_level = 0.0 # On ne descend pas sous 0%
            
        self.battery_pub.publish(Float32(data=self.battery_level))
        # ------------------------------

        # --- LECTURE LIDAR & MATHÉMATIQUES ---
        path = os.path.join(self.data_dir, filename)
        obj = np.fromfile(path, dtype=np.float32).reshape(-1, 4)
        points = obj[:, :3]

        mask = (points[:, 0] > 0) & (points[:, 0] < 8) & (points[:, 1] > -2) & (points[:, 1] < 2) & (points[:, 2] > -1.2)
        obstacle_points = points[mask]
        nb_obstacles = len(obstacle_points)
        is_blocked = nb_obstacles > 50

        if nb_obstacles > 0:
            distances = np.linalg.norm(obstacle_points, axis=1)
            min_distance = float(np.min(distances))
        else:
            min_distance = 8.0 
            
        self.dist_pub.publish(Float32(data=min_distance))
        self.status_pub.publish(Bool(data=is_blocked))
        self.count_pub.publish(Int32(data=nb_obstacles))
        self.publisher_.publish(pc2.create_cloud_xyz32(header, points))
        
        # --- CRÉATION DES ÉLÉMENTS 3D ---
        marker_array = MarkerArray()
        box = Marker()
        box.header = header
        box.ns = "zone_alerte"
        box.id = 0
        box.type = Marker.CUBE
        box.action = Marker.ADD
        box.pose.position.x = 4.0; box.pose.position.y = 0.0; box.pose.position.z = 0.0
        box.scale.x = 8.0; box.scale.y = 4.0; box.scale.z = 3.0
        box.color.a = 0.3 
        
        text = Marker()
        text.header = header
        text.ns = "zone_alerte"
        text.id = 1
        text.type = Marker.TEXT_VIEW_FACING
        text.action = Marker.ADD
        text.pose.position.x = 4.0; text.pose.position.y = 0.0; text.pose.position.z = 2.5 
        text.scale.z = 0.8 
        text.color.a = 1.0 

        if is_blocked:
            box.color.r = 1.0; box.color.g = 0.0; box.color.b = 0.0
            text.color.r = 1.0; text.color.g = 0.5; text.color.b = 0.0
            text.text = f"DANGER : {min_distance:.2f} m"
        else:
            box.color.r = 0.0; box.color.g = 1.0; box.color.b = 0.0
            text.color.r = 0.0; text.color.g = 1.0; text.color.b = 0.0
            text.text = "VOIE LIBRE"

        marker_array.markers.append(box)
        marker_array.markers.append(text)
        self.marker_pub.publish(marker_array)

        # --- CAMÉRAS ---
        image_name = filename.replace('.bin', '.png')
        image_path = os.path.join(self.image_dir, image_name)
        if os.path.exists(image_path):
            cv_image = cv2.imread(image_path)
            if cv_image is not None:
                img_msg = self.bridge.cv2_to_imgmsg(cv_image, encoding="bgr8")
                img_msg.header = header
                self.exterior_image_pub.publish(img_msg)

        if self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret:
                frame = cv2.resize(frame, (640, 480))
                img_msg_interior = self.bridge.cv2_to_imgmsg(frame, encoding="bgr8")
                img_msg_interior.header = header
                self.interior_image_pub.publish(img_msg_interior)

        self.current_frame += 1

    def destroy_node(self):
        if self.cap.isOpened():
            self.cap.release()
        super().destroy_node()

def main():
    rclpy.init()
    node = KittiPlayer()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == '__main__':
    main()
