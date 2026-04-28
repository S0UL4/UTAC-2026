import rclpy
from rclpy.node import Node
from std_msgs.msg import String

class DestinationNode(Node):
    """
    Panel Destination — Souscrit à /user_destination (String)
    Stocke et affiche la destination envoyée depuis Foxglove.
    """
    def __init__(self):
        super().__init__('destination_node')
        self.current_destination = 'Aucune destination'

        self.sub = self.create_subscription(
            String,
            '/user_destination',
            self.callback,
            10
        )
        self.get_logger().info('Panel Destination démarré.')

    def callback(self, msg):
        self.current_destination = msg.data
        self.get_logger().info(f'📍 Destination reçue : {self.current_destination}')

    def get_destination(self):
        return self.current_destination

def main():
    rclpy.init()
    node = DestinationNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == '__main__':
    main()
