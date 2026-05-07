import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json

class NoeudDestination(Node):
    def __init__(self):
        super().__init__('noeud_destination')
        self.create_subscription(String, '/user_destination', self.cb_destination, 10)
        self.get_logger().info('Nœud destination démarré !')

    def cb_destination(self, msg):
        try:
            data = json.loads(msg.data)
            destination = data.get("data", "")
        except json.JSONDecodeError:
            destination = msg.data

        if destination:
            self.get_logger().info(f'📍 Destination reçue : {destination}')
        else:
            self.get_logger().warn('Destination vide reçue !')

def main():
    rclpy.init()
    node = NoeudDestination()
    rclpy.spin(node)

if __name__ == '__main__':
    main()
