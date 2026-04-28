import rclpy
from rclpy.node import Node
from std_msgs.msg import Float32
import psutil

class BatteryNode(Node):
    """
    Panel Battery — Lit la batterie réelle de l'ordinateur
    et publie le niveau sur /battery_level (Float32)
    """
    def __init__(self):
        super().__init__('battery_node')
        self.battery_pub = self.create_publisher(Float32, 'battery_level', 10)
        self.timer = self.create_timer(1.0, self.timer_callback)  # toutes les secondes
        self.get_logger().info('Panel Battery démarré.')

    def timer_callback(self):
        battery = psutil.sensors_battery()
        if battery is not None:
            level = float(battery.percent)
            plugged = battery.power_plugged
            self.get_logger().info(f'Batterie : {level:.1f}% | {"En charge" if plugged else "Sur batterie"}')
        else:
            level = 0.0
            self.get_logger().warning('Batterie non détectée.')
        self.battery_pub.publish(Float32(data=level))

def main():
    rclpy.init()
    node = BatteryNode()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == '__main__':
    main()
