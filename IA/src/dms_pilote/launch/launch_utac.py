# src/dms_pilote/launch/launch_utac.py
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
import os
from ament_index_python.packages import get_package_share_directory

def generate_launch_description():
    pkg = get_package_share_directory("dms_pilote")

    # Arguments conservés
    inattention_time_arg = DeclareLaunchArgument(
        "inattention_time_tolerated", default_value="1.0")
    frequency_arg = DeclareLaunchArgument(
        "frequency", default_value="2500")
    duration_arg = DeclareLaunchArgument(
        "duration_ms", default_value="1000")
    prct_freinage_arg = DeclareLaunchArgument(
        "prct_freinage", default_value="10.0")

    # Nœud MediaPipe (Principal)
    mediapipe_node = Node(
        package='dms_pilote',
        executable='mediapipe_node.py',
        name='mediapipe_node',
        output='screen'
    )

    # Nœuds C++ de support
    attention_time_node = Node(
        package="dms_pilote",
        executable="attention_time_node",
        parameters=[{"inattention_time_tolerated": LaunchConfiguration("inattention_time_tolerated")}]
    )

    alarm_node = Node(
        package="dms_pilote",
        executable="alarm_node",
        parameters=[{"frequency": LaunchConfiguration("frequency"), "duration_ms": LaunchConfiguration("duration_ms")}]
    )

    freinage_node = Node(
        package="dms_pilote",
        executable="freinage_node",
        parameters=[{"prct_freinage": LaunchConfiguration("prct_freinage")}]
    )

    return LaunchDescription([
        inattention_time_arg,
        frequency_arg,
        duration_arg,
        prct_freinage_arg,
        mediapipe_node,
        attention_time_node,
        alarm_node,
        freinage_node
    ])
