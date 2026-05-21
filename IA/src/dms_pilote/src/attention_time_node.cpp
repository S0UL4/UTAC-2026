// src/attention_time_node.cpp
//
// Chronologie :
//   0s      → inattention détectée
//   1s      → alarme démarre  (inattention_time_tolerated)
//   1s+2s   → freinage démarre immédiatement à 1.0 (brake_delay)

#include <rclcpp/rclcpp.hpp>
#include <std_msgs/msg/float64.hpp>
#include <chrono>

using namespace std::chrono;

class AttentionTimeNode : public rclcpp::Node
{
public:
  AttentionTimeNode() : Node("attention_time_node"),
    debut_inattention_(-1.0),
    debut_alarme_(-1.0),
    debut_freinage_(-1.0),
    playing_(false)
  {
    this->declare_parameter<double>("inattention_time_tolerated", 1.0);
    this->declare_parameter<double>("brake_delay", 2.0);

    inattention_ok_ = this->get_parameter("inattention_time_tolerated").as_double();
    brake_delay_    = this->get_parameter("brake_delay").as_double();

    sub_ = this->create_subscription<std_msgs::msg::Float64>(
      "/driver/attention", 10,
      std::bind(&AttentionTimeNode::onAttention, this, std::placeholders::_1)
    );

    pub_braking_ = this->create_publisher<std_msgs::msg::Float64>("/driver/braking", 10);
    pub_playing_ = this->create_publisher<std_msgs::msg::Float64>("/driver/playing", 10);

    std_msgs::msg::Float64 zero;
    zero.data = 0.0;
    pub_braking_->publish(zero);
    pub_playing_->publish(zero);

    RCLCPP_INFO(this->get_logger(),
      "[AttentionTimeNode] Init – tolérance=%.1fs | délai frein=%.1fs",
      inattention_ok_, brake_delay_);
  }

private:
  void onAttention(const std_msgs::msg::Float64::SharedPtr msg)
  {
    double now         = now_seconds();
    double input       = msg->data;
    double out_playing = 0.0;
    double out_braking = 0.0;

    if (input == 1.0)
    {
      // ── Étape 1 : démarre le timer d'inattention ──────────
      if (debut_inattention_ < 0.0) {
        debut_inattention_ = now;
        RCLCPP_WARN(this->get_logger(), "[AttentionTimeNode] Inattention détectée");
      }

      double elapsed = now - debut_inattention_;

      // ── Étape 2 : alarme après inattention_time_tolerated ─
      if (elapsed >= inattention_ok_) {
        out_playing = 1.0;

        if (!playing_) {
          debut_alarme_ = now;
          playing_      = true;
          RCLCPP_WARN(this->get_logger(), "[AttentionTimeNode] ALARME ON");
        }

        // ── Étape 3 : freinage immédiat après brake_delay d'alarme ───
        double alarme_elapsed = now - debut_alarme_;

        if (alarme_elapsed >= brake_delay_) {

          if (debut_freinage_ < 0.0) {
            debut_freinage_ = now;
            RCLCPP_WARN(this->get_logger(), "[AttentionTimeNode] FREINAGE DÉMARRÉ");
          }

          out_braking = 1.0;

          RCLCPP_WARN(this->get_logger(),
            "[AttentionTimeNode] braking=1.0 (alarme depuis %.1fs)",
            alarme_elapsed);
        }
      }
    }
    else
    {
      // ── Reset complet si conducteur attentif ──────────────
      if (playing_) {
        RCLCPP_INFO(this->get_logger(), "[AttentionTimeNode] ALARME OFF – conducteur attentif");
        playing_ = false;
      }
      debut_inattention_ = -1.0;
      debut_alarme_      = -1.0;
      debut_freinage_    = -1.0;
      out_playing        = 0.0;
      out_braking        = 0.0;
    }

    std_msgs::msg::Float64 b_msg, p_msg;
    b_msg.data = out_braking;
    p_msg.data = out_playing;
    pub_braking_->publish(b_msg);
    pub_playing_->publish(p_msg);
  }

  double now_seconds() const
  {
    return duration_cast<duration<double>>(
      steady_clock::now().time_since_epoch()
    ).count();
  }

  rclcpp::Subscription<std_msgs::msg::Float64>::SharedPtr sub_;
  rclcpp::Publisher<std_msgs::msg::Float64>::SharedPtr    pub_braking_;
  rclcpp::Publisher<std_msgs::msg::Float64>::SharedPtr    pub_playing_;

  double inattention_ok_;
  double brake_delay_;
  double debut_inattention_;
  double debut_alarme_;
  double debut_freinage_;
  bool   playing_;
};

int main(int argc, char * argv[])
{
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<AttentionTimeNode>());
  rclcpp::shutdown();
  return 0;
}
