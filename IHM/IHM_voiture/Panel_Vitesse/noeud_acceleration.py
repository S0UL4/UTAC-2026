import rclpy
from rclpy.node import Node
from std_msgs.msg import Float32
import math

class NoeudAcceleration(Node):
    def __init__(self):
        super().__init__('noeud_acceleration')
        self.pub = self.create_publisher(Float32, '/acceleration_x', 10)
        self.timer = self.create_timer(0.05, self.publier)
        self.t = 0.0
        self.get_logger().info('Nœud accélération démarré !')

    def publier(self):
        msg = Float32()
        msg.data = float(math.sin(self.t))
        self.pub.publish(msg)
        self.t += 0.1

def main():
    rclpy.init()
    node = NoeudAcceleration()
    rclpy.spin(node)

if __name__ == '__main__':
    main()
