// src/frein_node.cpp
//
// Reçoit /driver/braking (Float64, 0.0→1.0)
// Reçoit /can_ami/signal/Vitesse_Vehicule (StampedSignal, km/h)
// Publie  /test_control_frein (Int32, 0→100 = % pédale)
//
// Recalcul à 20 Hz via timer interne → décélération constante garantie
//
// Physique :
//   a_aero   = (0.5 * CX_S * RHO * v²) / MASS
//   a_freins = TARGET_DECEL - a_aero
//   pédale%  = (a_freins / (MU_BRAKE * G)) * 100
//   commande = braking * pédale%  →  clamp [0, MAX_BRAKE_PERCENT]

#include <rclcpp/rclcpp.hpp>
#include <std_msgs/msg/float64.hpp>
#include <std_msgs/msg/int32.hpp>
// ── MODIFICATION 1 : Inclusion du header du message personnalisé ────────────
#include <ami_interfaces/msg/stamped_signal.hpp> 
#include <algorithm>
#include <cmath>

// ── Paramètres physiques (Citroën AMI) ──────────────────────────────────────
static constexpr double MASS             = 471.0;  // kg
static constexpr double MU_BRAKE         = 0.7;    // coefficient freinage
static constexpr double G                = 9.81;   // m/s²
static constexpr double RHO              = 1.225;  // kg/m³
static constexpr double CX_S             = 0.45;   // m² (Cx × surface frontale)

// ── Paramètres de contrôle ───────────────────────────────────────────────────
static constexpr double TARGET_DECEL_MS2  = 3.0;   // m/s² décélération cible
static constexpr int    MAX_BRAKE_PERCENT = 50;    // % pédale max autorisé
static constexpr double SPEED_TIMEOUT_SEC = 1.0;   // timeout vitesse → fallback
static constexpr int    TIMER_HZ          = 20;    // fréquence de recalcul

class FreinNode : public rclcpp::Node
{
public:
  FreinNode() : Node("frein_node"),
    current_speed_kmh_(0.0),
    current_braking_(0.0),
    speed_received_(false),
    last_speed_time_(this->now())
  {
    sub_braking_ = this->create_subscription<std_msgs::msg::Float64>(
      "/driver/braking", 10,
      std::bind(&FreinNode::onBraking, this, std::placeholders::_1));

    // ── MODIFICATION 2 : Type StampedSignal et application de la QoS Best Effort ──
    sub_speed_ = this->create_subscription<ami_interfaces::msg::StampedSignal>(
      "/can_ami/signal/Vitesse_Vehicule", 
      rclcpp::QoS(10).best_effort(),
      std::bind(&FreinNode::onSpeed, this, std::placeholders::_1));

    pub_ = this->create_publisher<std_msgs::msg::Int32>(
      "/brake_req/detection", 10);

    // Timer 20 Hz – recalcul continu indépendant des topics entrants
    timer_ = this->create_wall_timer(
      std::chrono::milliseconds(1000 / TIMER_HZ),
      std::bind(&FreinNode::onTimer, this));

    publishBrake(0);

    RCLCPP_INFO(this->get_logger(),
      "[FreinNode] Prêt – cible=%.1f m/s² | max pédale=%d%% | masse=%.0f kg | mu=%.2f | %d Hz",
      TARGET_DECEL_MS2, MAX_BRAKE_PERCENT, MASS, MU_BRAKE, TIMER_HZ);
  }

private:
  // ── MODIFICATION 3 : Changement du type de message dans l'argument du callback ──
  void onSpeed(const ami_interfaces::msg::StampedSignal::SharedPtr msg)
  {
    // ── MODIFICATION 4 : Récupération du champ .value au lieu de .data ──────────
    current_speed_kmh_ = std::abs(msg->value);
    speed_received_    = true;
    last_speed_time_   = this->now();
  }

  void onBraking(const std_msgs::msg::Float64::SharedPtr msg)
  {
    current_braking_ = std::clamp(msg->data, 0.0, 1.0);
  }

  // ── Timer 20 Hz : recalcul et publication ─────────────────────────────────
  void onTimer()
  {
    if (current_braking_ == 0.0) {
      publishBrake(0);
      return;
    }

    int brake_command = computeBrakeCommand(current_braking_);
    publishBrake(brake_command);
  }

  // ── Calcul du % pédale pour obtenir TARGET_DECEL_MS2 ──────────────────────
  int computeBrakeCommand(double braking)
  {
    bool speed_fresh = speed_received_ &&
      (this->now() - last_speed_time_).seconds() < SPEED_TIMEOUT_SEC;

    if (!speed_fresh) {
      int raw = static_cast<int>(braking * MAX_BRAKE_PERCENT);
      RCLCPP_WARN(this->get_logger(),
        "[FreinNode] ⚠ Vitesse indisponible – mode brut : %d/%d (braking=%.3f)",
        raw, MAX_BRAKE_PERCENT, braking);
      return raw;
    }

    // Étape 1 : vitesse en m/s
    double v_ms = current_speed_kmh_ / 3.6;

    // Étape 2 : décélération aérodynamique
    double a_aero = (0.5 * CX_S * RHO * v_ms * v_ms) / MASS;

    // Étape 3 : décélération restante à produire par les freins
    double a_freins = TARGET_DECEL_MS2 - a_aero;

    if (a_freins <= 0.0) {
      RCLCPP_INFO(this->get_logger(),
        "[FreinNode] Aéro suffisante (a_aero=%.3f m/s²) – commande=0", a_aero);
      return 0;
    }

    // Étape 4 : % pédale physique nécessaire
    double pedale_pct = (a_freins / (MU_BRAKE * G)) * 100.0;

    // Étape 5 : modulation par braking (toujours 1.0 depuis attention_time_node)
    double commande = braking * pedale_pct;

    // Étape 6 : clamp
    int brake_command = static_cast<int>(
      std::clamp(commande, 0.0, static_cast<double>(MAX_BRAKE_PERCENT)));

    RCLCPP_INFO(this->get_logger(),
      "[FreinNode] v=%.1f km/h | a_aero=%.3f | a_freins=%.3f | pédale=%.1f%% | commande=%d",
      current_speed_kmh_, a_aero, a_freins, pedale_pct, brake_command);

    return brake_command;
  }

  void publishBrake(int value)
  {
    std_msgs::msg::Int32 out;
    out.data = value;
    pub_->publish(out);
  }

  rclcpp::Subscription<std_msgs::msg::Float64>::SharedPtr sub_braking_;
  // ── MODIFICATION 5 : Changement du type du pointeur de l'abonnement ─────────
  rclcpp::Subscription<ami_interfaces::msg::StampedSignal>::SharedPtr sub_speed_;
  rclcpp::Publisher<std_msgs::msg::Int32>::SharedPtr      pub_;
  rclcpp::TimerBase::SharedPtr                            timer_;

  double       current_speed_kmh_;
  double       current_braking_;
  bool         speed_received_;
  rclcpp::Time last_speed_time_;
};

int main(int argc, char * argv[])
{
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<FreinNode>());
  rclcpp::shutdown();
  return 0;
}
