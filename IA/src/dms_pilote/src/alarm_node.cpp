// src/alarm_node.cpp
// Bip en boucle avec aplay — fonctionne sur VM
// S'arrête immédiatement via pkill aplay
#include <rclcpp/rclcpp.hpp>
#include <std_msgs/msg/float64.hpp>
#include <cstdlib>
#include <string>
#include <thread>
#include <atomic>
#include <chrono>

class AlarmNode : public rclcpp::Node
{
public:
  AlarmNode() : Node("alarm_node"),
    should_beep_(false),
    beep_running_(false)
  {
    this->declare_parameter<std::string>("wav_file",    "/tmp/beep_dms.wav");
    this->declare_parameter<int>        ("frequency",   2500);
    this->declare_parameter<int>        ("duration_ms", 500);
    this->declare_parameter<std::string>("audio_device", "plughw:1,0");

    wav_file_     = this->get_parameter("wav_file").as_string();
    frequency_    = this->get_parameter("frequency").as_int();
    duration_ms_  = this->get_parameter("duration_ms").as_int();
    audio_device_ = this->get_parameter("audio_device").as_string();

    // Génère le fichier WAV au démarrage via sox
    std::string gen = "sox -n " + wav_file_ +
      " synth " + std::to_string(duration_ms_ / 1000.0) +
      " sine "  + std::to_string(frequency_) + " 2>/dev/null";
    std::system(gen.c_str());

    sub_ = this->create_subscription<std_msgs::msg::Float64>(
      "/driver/playing", 10,
      std::bind(&AlarmNode::onPlaying, this, std::placeholders::_1)
    );

    RCLCPP_INFO(this->get_logger(),
      "[AlarmNode] Initialisé – wav=%s freq=%d Hz durée=%d ms device=%s",
      wav_file_.c_str(), frequency_, duration_ms_, audio_device_.c_str());
  }

  ~AlarmNode()
  {
    should_beep_  = false;
    beep_running_ = false;
    std::system("pkill -x aplay 2>/dev/null");
  }

private:
  void onPlaying(const std_msgs::msg::Float64::SharedPtr msg)
  {
    bool alert = (msg->data >= 0.5);
    if (alert && !beep_running_)
    {
      should_beep_  = true;
      beep_running_ = true;
      std::thread([this]() { beepLoop(); }).detach();
      RCLCPP_WARN(this->get_logger(), "[AlarmNode] ALARME DÉCLENCHÉE");
    }
    else if (!alert && beep_running_)
    {
      should_beep_  = false;
      std::system("pkill -x aplay 2>/dev/null");
      RCLCPP_INFO(this->get_logger(), "[AlarmNode] ALARME ÉTEINTE");
    }
  }

  void beepLoop()
  {
    while (should_beep_)
    {
      // Lance aplay avec le bon périphérique audio
      std::string cmd = "aplay -D " + audio_device_ + " " + wav_file_ + " 2>/dev/null";
      std::system(cmd.c_str());

      // Petite pause entre deux bips (100ms)
      for (int i = 0; i < 10 && should_beep_; ++i)
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    std::system("pkill -x aplay 2>/dev/null");
    beep_running_ = false;
  }

  rclcpp::Subscription<std_msgs::msg::Float64>::SharedPtr sub_;
  std::atomic<bool> should_beep_;
  std::atomic<bool> beep_running_;
  std::string wav_file_;
  std::string audio_device_;
  int frequency_;
  int duration_ms_;
};

int main(int argc, char * argv[])
{
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<AlarmNode>());
  rclcpp::shutdown();
  return 0;
}
