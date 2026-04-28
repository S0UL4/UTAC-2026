"""
main.py — Point d'entrée principal IHM_voiture
Orchestre tous les panels :
  - Panel_Battery     → battery_node.py
  - Panel_Camera      → camera_node.py
  - Panel_3D          → panel_3d_node.py
  - Panel_Obstacle    → obstacle_node.py
  - Panel_Emergency   → emergency_node.py
  - Panel_Destination → destination_node.py
"""

import rclpy
from rclpy.node import Node
from std_msgs.msg import Header
import numpy as np
import os
import sys

# Import des panels
sys.path.append(os.path.dirname(__file__))
from Panel_Battery.battery_node import BatteryNode
from Panel_Camera.camera_node import CameraNode
from Panel_3D.panel_3d_node import Panel3DNode
from Panel_Obstacle.obstacle_node import ObstacleNode
from Panel_Emergency.emergency_node import EmergencyNode
from Panel_Destination.destination_node import DestinationNode

class IHMVoitureMain(Node):
    def __init__(self):
        super().__init__('ihm_voiture_main')

        # Initialisation de tous les panels
        self.battery    = BatteryNode()
        self.panel_3d   = Panel3DNode()
        self.obstacle   = ObstacleNode()
        self.emergency  = EmergencyNode()
        self.destination = DestinationNode()
        self.camera     = CameraNode(None, None)

        # Données KITTI
        self.data_dir = os.path.expanduser('~/test_lidar/data/')
        self.file_list = sorted([f for f in os.listdir(self.data_dir) if f.endswith('.bin')])
        self.current_frame = 0

        self.timer = self.create_timer(0.1, self.timer_callback)
        self.get_logger().info('🚗 IHM Voiture — Tous les panels démarrés.')

    def timer_callback(self):
        # Arrêt d'urgence prioritaire
        if self.emergency.is_emergency_active():
            self.get_logger().warn('🚨 Arrêt d\'urgence actif — système en pause.')
            return

        if not self.file_list:
            return
        if self.current_frame >= len(self.file_list):
            self.current_frame = 0

        filename = self.file_list[self.current_frame]
        header = Header(frame_id='map', stamp=self.get_clock().now().to_msg())

        # Batterie
        self.battery.timer_callback()

        # Lecture LiDAR
        path = os.path.join(self.data_dir, filename)
        obj = np.fromfile(path, dtype=np.float32).reshape(-1, 4)
        points = obj[:, :3]

        # Analyse obstacles
        is_blocked, nb_obstacles, min_distance = self.obstacle.analyze_and_publish(points)

        # Destination courante
        destination = self.destination.get_destination()

        # Visualisation 3D
        self.panel_3d.publish(header, points, is_blocked, min_distance, destination)

        # Caméras
        self.camera.publish(header, filename)

        self.current_frame += 1

    def destroy_node(self):
        self.camera.destroy_node()
        super().destroy_node()


def main():
    rclpy.init()
    node = IHMVoitureMain()

    executor = rclpy.executors.MultiThreadedExecutor()
    executor.add_node(node)
    executor.add_node(node.emergency)
    executor.add_node(node.destination)

    try:
        executor.spin()
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
