cmake_minimum_required(VERSION 3.8)
project(dms_pilote)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 1. Dépendances
find_package(ament_cmake REQUIRED)
find_package(ament_cmake_python REQUIRED)
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)
find_package(sensor_msgs REQUIRED)
find_package(ami_interfaces REQUIRED)

# 2. Nodes C++ (uniquement les utilitaires)
add_executable(attention_time_node src/attention_time_node.cpp)
ament_target_dependencies(attention_time_node rclcpp std_msgs)

add_executable(alarm_node src/alarm_node.cpp)
ament_target_dependencies(alarm_node rclcpp std_msgs)

add_executable(freinage_node src/freinage_node.cpp)
# ── MODIFICATION : Ajout de ami_interfaces pour lier le message de la vitesse ──
ament_target_dependencies(freinage_node rclcpp std_msgs ami_interfaces)


# 3. Installation des exécutables C++
install(TARGETS
  attention_time_node
  freinage_node
  alarm_node
  DESTINATION lib/${PROJECT_NAME}
)

# 4. Installation des scripts Python et fichiers Launch
install(PROGRAMS
  dms_pilote/mediapipe_node.py
  DESTINATION lib/${PROJECT_NAME}
)

install(DIRECTORY launch
  DESTINATION share/${PROJECT_NAME}
)

ament_package()
