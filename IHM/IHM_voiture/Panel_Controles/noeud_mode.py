import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json

class NoeudMode(Node):
    def __init__(self):
        super().__init__('noeud_mode')
        self.create_subscription(String, '/obstacle_strategy', self.cb_mode, 10)
        self.get_logger().info('Nœud mode démarré !')

    def cb_mode(self, msg):
        try:
            data = json.loads(msg.data)
            mode = data.get("data", "")
        except json.JSONDecodeError:
            mode = msg.data

        if mode == "cautious":
            self.get_logger().info('⚠️ Mode prudent activé')
        elif mode == "frequent_stops":
            self.get_logger().info('🚏 Mode arrêts fréquents activé')
        elif mode == "roadwork":
            self.get_logger().info('🚧 Mode attention travaux activé')
        elif mode == "keep_left":
            self.get_logger().info('⬅️ Mode serrez à gauche activé')
        elif mode == "keep_right":
            self.get_logger().info('➡️ Mode serrez à droite activé')
        else:
            self.get_logger().warn(f'Mode inconnu reçu : {mode}')

def main():
    rclpy.init()
    node = NoeudMode()
    rclpy.spin(node)

if __name__ == '__main__':
    main()
