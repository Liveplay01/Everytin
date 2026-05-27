export interface SecurityStatus {
  defender_enabled: boolean
  defender_realtime: boolean
  defender_up_to_date: boolean
  defender_last_scan: string | null
  firewall_domain: boolean
  firewall_private: boolean
  firewall_public: boolean
  bitlocker_protected: boolean
  uac_enabled: boolean
  auto_update_enabled: boolean
  score: number
  issues: string[]
}
