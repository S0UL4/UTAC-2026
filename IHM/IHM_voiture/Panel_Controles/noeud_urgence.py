import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json

class NoeudUrgence(Node):
    def __init__(self):
        super().__init__('noeud_urgence')
        self.create_subscription(String, '/arret_urgence', self.cb_urgence, 10)
        self.get_logger().info('Nœud urgence démarré !')

    def cb_urgence(self, msg):
        try:
            data = json.loads(msg.data)
            commande = data.get("data", "")
        except json.JSONDecodeError:
            commande = msg.data
        self.get_logger().warn(f'🚨 ARRÊT D\'URGENCE reçu : {commande}')

def main():
    rclpy.init()
    node = NoeudUrgence()
    rclpy.spin(node)

if __name__ == '__main__':
    main()
