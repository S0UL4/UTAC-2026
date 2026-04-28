import rclpy
from rclpy.node import Node
from std_msgs.msg import Bool

class EmergencyNode(Node):
    """
    Panel Emergency — Souscrit à /emergency_stop (Bool)
    Arrête tout le système si True.
    """
    def __init__(self):
        super().__init__('emergency_node')
        self.is_stopped = False

        self.sub = self.create_subscription(
            Bool,
            '/emergency_stop',
            self.callback,
            10
        )
        self.get_logger().info('Panel Emergency démarré.')

    def callback(self, msg):
        self.is_stopped = msg.data
        if self.is_stopped:
            self.get_logger().warn('⚠️  ARRÊT D\'URGENCE ACTIVÉ — Système stoppé !')
        else:
            self.get_logger().info('✅ Arrêt d\'urgence désactivé — Reprise normale.')

    def is_emergency_active(self):
        return self.is_stopped

def main():
    rclpy.init()
    node = EmergencyNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == '__main__':
    main()
