import rclpy
from rclpy.node import Node
from std_msgs.msg import Bool, Int32, Float32
import numpy as np

class ObstacleNode(Node):
    """
    Panel Obstacle — Analyse les points LiDAR et publie :
      - /blocking_movement           : True si obstacle détecté (Bool)
      - /obstacle_points_count       : nombre de points obstacles (Int32)
      - /closest_obstacle_distance   : distance au plus proche obstacle (Float32)
    """
    def __init__(self):
        super().__init__('obstacle_node')
        self.status_pub = self.create_publisher(Bool, 'blocking_movement', 10)
        self.count_pub = self.create_publisher(Int32, 'obstacle_points_count', 10)
        self.dist_pub = self.create_publisher(Float32, 'closest_obstacle_distance', 10)
        self.get_logger().info('Panel Obstacle démarré.')

    def analyze_and_publish(self, points):
        """
        Reçoit un tableau numpy de points (x, y, z)
        et publie les métriques d'obstacle.
        """
        mask = (
            (points[:, 0] > 0) & (points[:, 0] < 8) &
            (points[:, 1] > -2) & (points[:, 1] < 2) &
            (points[:, 2] > -1.2)
        )
        obstacle_points = points[mask]
        nb_obstacles = len(obstacle_points)
        is_blocked = nb_obstacles > 50

        if nb_obstacles > 0:
            min_distance = float(np.min(np.linalg.norm(obstacle_points, axis=1)))
        else:
            min_distance = 8.0

        self.status_pub.publish(Bool(data=is_blocked))
        self.count_pub.publish(Int32(data=nb_obstacles))
        self.dist_pub.publish(Float32(data=min_distance))

        return is_blocked, nb_obstacles, min_distance

def main():
    rclpy.init()
    node = ObstacleNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == '__main__':
    main()
