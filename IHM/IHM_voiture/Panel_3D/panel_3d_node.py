import rclpy
from rclpy.node import Node
from sensor_msgs.msg import PointCloud2
from visualization_msgs.msg import Marker, MarkerArray
import sensor_msgs_py.point_cloud2 as pc2
import numpy as np

class Panel3DNode(Node):
    """
    Panel 3D — Publie :
      - /kitti_cloud    : nuage de points LiDAR
      - /detection_zone : marqueurs 3D (zone d'alerte + texte)
    """
    def __init__(self):
        super().__init__('panel_3d_node')
        self.cloud_pub = self.create_publisher(PointCloud2, 'kitti_cloud', 10)
        self.marker_pub = self.create_publisher(MarkerArray, 'detection_zone', 10)
        self.get_logger().info('Panel 3D démarré.')

    def publish(self, header, points, is_blocked, min_distance, destination):
        # Nuage de points
        self.cloud_pub.publish(pc2.create_cloud_xyz32(header, points))

        # Marqueurs
        marker_array = MarkerArray()

        box = Marker()
        box.header = header
        box.ns = 'zone_alerte'
        box.id = 0
        box.type = Marker.CUBE
        box.action = Marker.ADD
        box.pose.position.x = 4.0
        box.pose.position.y = 0.0
        box.pose.position.z = 0.0
        box.scale.x = 8.0
        box.scale.y = 4.0
        box.scale.z = 3.0
        box.color.a = 0.3

        text = Marker()
        text.header = header
        text.ns = 'zone_alerte'
        text.id = 1
        text.type = Marker.TEXT_VIEW_FACING
        text.action = Marker.ADD
        text.pose.position.x = 4.0
        text.pose.position.y = 0.0
        text.pose.position.z = 2.5
        text.scale.z = 0.8
        text.color.a = 1.0

        if is_blocked:
            box.color.r = 1.0; box.color.g = 0.0; box.color.b = 0.0
            text.color.r = 1.0; text.color.g = 0.5; text.color.b = 0.0
            text.text = f'DANGER : {min_distance:.2f} m'
        else:
            box.color.r = 0.0; box.color.g = 1.0; box.color.b = 0.0
            text.color.r = 0.0; text.color.g = 1.0; text.color.b = 0.0
            text.text = f'VOIE LIBRE | Dest: {destination}'

        marker_array.markers.append(box)
        marker_array.markers.append(text)
        self.marker_pub.publish(marker_array)

def main():
    rclpy.init()
    node = Panel3DNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == '__main__':
    main()
