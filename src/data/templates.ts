import type { GreenTextLanguageId } from './languages';

export interface TemplateDefinition {
  id: string;
  name: string;
  vendor: string;
  platform: string;
  category: string;
  description: string;
  language: GreenTextLanguageId;
  tags: string[];
  variables: string[];
  body: string;
}

export const TEMPLATE_PACKS: TemplateDefinition[] = [
  {
    id: 'aruba-cx-access-vlan',
    name: 'Access VLAN edge port',
    vendor: 'Aruba',
    platform: 'CX',
    category: 'Switching',
    description: 'Create a VLAN and assign a single access edge port.',
    language: 'aruba-cx',
    tags: ['vlan', 'access', 'edge'],
    variables: ['vlan_id', 'vlan_name', 'interface_id', 'description'],
    body: `vlan {{vlan_id}}
   name {{vlan_name}}
!
interface {{interface_id}}
   description {{description}}
   no shutdown
   vlan access {{vlan_id}}
   spanning-tree port-type admin-edge
   lldp transmit
   lldp receive
!`,
  },
  {
    id: 'aruba-cx-lag-trunk',
    name: 'LAG trunk uplink',
    vendor: 'Aruba',
    platform: 'CX',
    category: 'Switching',
    description: 'Build an LACP LAG with allowed VLANs for an uplink.',
    language: 'aruba-cx',
    tags: ['lag', 'lacp', 'trunk'],
    variables: ['lag_id', 'uplink_description', 'member_1', 'member_2', 'native_vlan', 'allowed_vlans'],
    body: `interface lag {{lag_id}}
   description {{uplink_description}}
   no shutdown
   lacp mode active
   vlan trunk native {{native_vlan}}
   vlan trunk allowed {{allowed_vlans}}
!
interface {{member_1}}
   no shutdown
   lag {{lag_id}}
!
interface {{member_2}}
   no shutdown
   lag {{lag_id}}
!`,
  },
  {
    id: 'aruba-cx-ospf-svi',
    name: 'OSPF routed SVI',
    vendor: 'Aruba',
    platform: 'CX',
    category: 'Routing',
    description: 'Create a routed VLAN interface and advertise it into OSPF.',
    language: 'aruba-cx',
    tags: ['ospf', 'routing', 'svi'],
    variables: ['vlan_id', 'vlan_name', 'gateway_cidr', 'ospf_area'],
    body: `vlan {{vlan_id}}
   name {{vlan_name}}
!
interface vlan {{vlan_id}}
   ip address {{gateway_cidr}}
   ip ospf area {{ospf_area}}
   no shutdown
!
router ospf 1
   area {{ospf_area}}
!`,
  },
  {
    id: 'aruba-cx-mgmt-hardening',
    name: 'Management hardening',
    vendor: 'Aruba',
    platform: 'CX',
    category: 'Security',
    description: 'Baseline SSH, NTP, syslog, SNMPv3, and banner management settings.',
    language: 'aruba-cx',
    tags: ['ssh', 'snmpv3', 'syslog', 'ntp'],
    variables: ['hostname', 'domain', 'ntp_server', 'syslog_server', 'snmp_location', 'snmp_contact'],
    body: `hostname {{hostname}}
domain-name {{domain}}
ssh server vrf mgmt
no telnet server
ntp server {{ntp_server}} vrf mgmt
logging {{syslog_server}} vrf mgmt
snmp-server vrf mgmt
snmp-server system-location "{{snmp_location}}"
snmp-server system-contact "{{snmp_contact}}"
banner motd #
Authorized access only.
#
!`,
  },
  {
    id: 'aruba-cx-vsx-core',
    name: 'VSX core pair',
    vendor: 'Aruba',
    platform: 'CX',
    category: 'Resiliency',
    description: 'Starter VSX system MAC, ISL, keepalive, and role configuration.',
    language: 'aruba-cx',
    tags: ['vsx', 'core', 'redundancy'],
    variables: ['system_mac', 'isl_lag', 'keepalive_peer', 'keepalive_source', 'role'],
    body: `vsx
   system-mac {{system_mac}}
   inter-switch-link lag {{isl_lag}}
   keepalive peer {{keepalive_peer}} source {{keepalive_source}} vrf mgmt
   role {{role}}
!`,
  },
  {
    id: 'aruba-cx-acl-vty',
    name: 'Management ACL',
    vendor: 'Aruba',
    platform: 'CX',
    category: 'Security',
    description: 'Restrict management access to approved subnets.',
    language: 'aruba-cx',
    tags: ['acl', 'management', 'security'],
    variables: ['acl_name', 'admin_subnet', 'jump_host', 'deny_log'],
    body: `access-list ip {{acl_name}}
   10 permit tcp {{admin_subnet}} any eq ssh
   20 permit tcp host {{jump_host}} any eq https
   90 deny any any {{deny_log}}
!
ssh server acl {{acl_name}}
https-server access-list {{acl_name}}
!`,
  },
  {
    id: 'aruba-aos-s-voice-vlan',
    name: 'AOS-S voice/data edge',
    vendor: 'Aruba',
    platform: 'AOS-S',
    category: 'Switching',
    description: 'Voice/data edge port example for Aruba AOS-S.',
    language: 'aruba-aos-s',
    tags: ['voice', 'vlan', 'edge'],
    variables: ['port', 'description', 'data_vlan', 'voice_vlan'],
    body: `vlan {{data_vlan}}
   name "DATA"
   untagged {{port}}
   exit
vlan {{voice_vlan}}
   name "VOICE"
   tagged {{port}}
   voice
   exit
interface {{port}}
   name "{{description}}"
   exit`,
  },
  {
    id: 'aruba-aos-s-management',
    name: 'AOS-S management baseline',
    vendor: 'Aruba',
    platform: 'AOS-S',
    category: 'Management',
    description: 'SNTP, syslog, SSH, and management VLAN starter.',
    language: 'aruba-aos-s',
    tags: ['management', 'sntp', 'syslog', 'ssh'],
    variables: ['management_vlan', 'switch_ip_cidr', 'gateway', 'sntp_server', 'syslog_server'],
    body: `management-vlan {{management_vlan}}
ip default-gateway {{gateway}}
vlan {{management_vlan}}
   name "MGMT"
   ip address {{switch_ip_cidr}}
   exit
timesync sntp
sntp unicast
sntp server priority 1 {{sntp_server}}
logging {{syslog_server}}
ip ssh
no telnet-server`,
  },
  {
    id: 'aruba-wireless-enterprise-ssid',
    name: 'Enterprise 802.1X SSID',
    vendor: 'Aruba',
    platform: 'Wireless',
    category: 'WLAN',
    description: 'Enterprise SSID profile tied to AAA and VLAN.',
    language: 'aruba-wireless',
    tags: ['ssid', '802.1x', 'aaa'],
    variables: ['ssid_name', 'vlan_id', 'aaa_profile', 'radius_server'],
    body: `aaa authentication-server radius {{radius_server}}
   host {{radius_server_ip}}
   key {{radius_secret}}
!
aaa profile {{aaa_profile}}
   authentication-dot1x {{radius_server}}
!
wlan ssid-profile {{ssid_name}}
   essid {{ssid_name}}
   opmode wpa2-aes
!
wlan virtual-ap {{ssid_name}}-vap
   aaa-profile {{aaa_profile}}
   ssid-profile {{ssid_name}}
   vlan {{vlan_id}}
!`,
  },
  {
    id: 'aruba-wireless-guest-ssid',
    name: 'Guest SSID skeleton',
    vendor: 'Aruba',
    platform: 'Wireless',
    category: 'Guest',
    description: 'Guest SSID with role, VLAN, and captive portal placeholders.',
    language: 'aruba-wireless',
    tags: ['guest', 'captive portal', 'role'],
    variables: ['ssid_name', 'guest_vlan', 'guest_role', 'portal_profile'],
    body: `user-role {{guest_role}}
   captive-portal {{portal_profile}}
   access-list session guest-logon
   access-list session captiveportal
!
wlan ssid-profile {{ssid_name}}
   essid {{ssid_name}}
   opmode opensystem
!
wlan virtual-ap {{ssid_name}}-vap
   ssid-profile {{ssid_name}}
   vlan {{guest_vlan}}
   initial-role {{guest_role}}
!`,
  },
  {
    id: 'aruba-wireless-rf-profile',
    name: 'RF profile notes',
    vendor: 'Aruba',
    platform: 'Wireless',
    category: 'RF',
    description: 'Document RF power/channel intent before applying AP-group changes.',
    language: 'aruba-wireless',
    tags: ['rf', 'ap-group', 'radio'],
    variables: ['ap_group', 'band', 'min_power', 'max_power', 'allowed_channels'],
    body: `# AP group: {{ap_group}}
# Band: {{band}}
# Intended channels: {{allowed_channels}}

rf dot11{{band}}-radio-profile {{ap_group}}-{{band}}
   min-tx-power {{min_power}}
   max-tx-power {{max_power}}
   allowed-channels {{allowed_channels}}
!
ap-group {{ap_group}}
   dot11{{band}}-radio-profile {{ap_group}}-{{band}}
!`,
  },
  {
    id: 'junos-irb-vlan',
    name: 'VLAN + IRB gateway',
    vendor: 'Juniper',
    platform: 'Junos',
    category: 'Switching',
    description: 'Create a VLAN, L3 interface, and assign an access port.',
    language: 'juniper-junos',
    tags: ['vlan', 'irb', 'switching'],
    variables: ['vlan_name', 'vlan_id', 'irb_unit', 'gateway_ip', 'interface_id'],
    body: `set vlans {{vlan_name}} vlan-id {{vlan_id}}
set vlans {{vlan_name}} l3-interface irb.{{irb_unit}}
set interfaces irb unit {{irb_unit}} family inet address {{gateway_ip}}
set interfaces {{interface_id}} unit 0 family ethernet-switching interface-mode access
set interfaces {{interface_id}} unit 0 family ethernet-switching vlan members {{vlan_name}}`,
  },
  {
    id: 'junos-bgp-peer',
    name: 'BGP peer group',
    vendor: 'Juniper',
    platform: 'Junos',
    category: 'Routing',
    description: 'External BGP group with export/import policy placeholders.',
    language: 'juniper-junos',
    tags: ['bgp', 'routing', 'policy'],
    variables: ['local_as', 'peer_group', 'peer_as', 'peer_ip', 'import_policy', 'export_policy'],
    body: `set routing-options autonomous-system {{local_as}}
set protocols bgp group {{peer_group}} type external
set protocols bgp group {{peer_group}} peer-as {{peer_as}}
set protocols bgp group {{peer_group}} neighbor {{peer_ip}}
set protocols bgp group {{peer_group}} import {{import_policy}}
set protocols bgp group {{peer_group}} export {{export_policy}}`,
  },
  {
    id: 'junos-firewall-filter',
    name: 'Firewall filter term',
    vendor: 'Juniper',
    platform: 'Junos',
    category: 'Security',
    description: 'Reusable firewall filter term with match/action placeholders.',
    language: 'juniper-junos',
    tags: ['firewall', 'filter', 'security'],
    variables: ['filter_name', 'term_name', 'source_prefix', 'destination_port', 'action'],
    body: `set firewall family inet filter {{filter_name}} term {{term_name}} from source-address {{source_prefix}}
set firewall family inet filter {{filter_name}} term {{term_name}} from destination-port {{destination_port}}
set firewall family inet filter {{filter_name}} term {{term_name}} then {{action}}
set firewall family inet filter {{filter_name}} term default-deny then discard`,
  },
  {
    id: 'junos-evpn-vxlan',
    name: 'EVPN/VXLAN starter',
    vendor: 'Juniper',
    platform: 'Junos',
    category: 'Datacenter',
    description: 'Minimal EVPN/VXLAN routing-instance and VNI skeleton.',
    language: 'juniper-junos',
    tags: ['evpn', 'vxlan', 'vni'],
    variables: ['instance_name', 'vlan_name', 'vlan_id', 'vni', 'route_distinguisher', 'vrf_target'],
    body: `set routing-instances {{instance_name}} instance-type mac-vrf
set routing-instances {{instance_name}} route-distinguisher {{route_distinguisher}}
set routing-instances {{instance_name}} vrf-target target:{{vrf_target}}
set routing-instances {{instance_name}} vlans {{vlan_name}} vlan-id {{vlan_id}}
set routing-instances {{instance_name}} vlans {{vlan_name}} vxlan vni {{vni}}
set protocols evpn encapsulation vxlan`,
  },
  {
    id: 'junos-snmp-syslog',
    name: 'SNMP + syslog baseline',
    vendor: 'Juniper',
    platform: 'Junos',
    category: 'Management',
    description: 'Common management telemetry starter lines.',
    language: 'juniper-junos',
    tags: ['snmp', 'syslog', 'management'],
    variables: ['community', 'syslog_host'],
    body: `set snmp community {{community}} authorization read-only
set system syslog host {{syslog_host}} any info
set system syslog host {{syslog_host}} authorization info
set system syslog file messages any notice`,
  },
  {
    id: 'junos-change-rollback',
    name: 'Junos change checklist',
    vendor: 'Juniper',
    platform: 'Junos',
    category: 'Change Control',
    description: 'Operational command checklist for safe Junos changes.',
    language: 'juniper-junos',
    tags: ['commit', 'rollback', 'checklist'],
    variables: ['ticket_id', 'change_summary'],
    body: `# {{ticket_id}} - {{change_summary}}
show | compare
commit check
commit confirmed 10 comment "{{ticket_id}} {{change_summary}}"
show system commit
# If validation fails:
rollback 1
commit comment "{{ticket_id}} rollback"`,
  },
  {
    id: 'mist-apstra-blueprint-notes',
    name: 'Apstra blueprint notes',
    vendor: 'Juniper',
    platform: 'Apstra',
    category: 'Intent',
    description: 'Human-readable blueprint intent notes before generating configlets.',
    language: 'mist-apstra',
    tags: ['blueprint', 'intent', 'notes'],
    variables: ['blueprint', 'fabric_role', 'intent', 'risk'],
    body: `# Blueprint: {{blueprint}}
# Fabric role: {{fabric_role}}
# Intent: {{intent}}
# Risk/rollback notes: {{risk}}

validation:
  - cabling-map
  - anomalies
  - configlet-render
  - staged-diff
`,
  },
  {
    id: 'mist-apstra-configlet-jinja',
    name: 'Apstra configlet Jinja',
    vendor: 'Juniper',
    platform: 'Apstra',
    category: 'Configlet',
    description: 'Jinja-style configlet body for generated Junos snippets.',
    language: 'mist-apstra',
    tags: ['configlet', 'jinja', 'junos'],
    variables: ['configlet_name', 'ntp_server', 'syslog_host'],
    body: `# Configlet: {{configlet_name}}
{% if system.role == "leaf" %}
set system ntp server {{ntp_server}}
set system syslog host {{syslog_host}} any notice
{% endif %}
`,
  },
  {
    id: 'mist-site-template-json',
    name: 'Mist site variables JSON',
    vendor: 'Juniper',
    platform: 'Mist',
    category: 'Automation',
    description: 'JSON starter for site/device variables used by automation workflows.',
    language: 'mist-apstra',
    tags: ['mist', 'json', 'variables'],
    variables: ['site_name', 'timezone', 'country_code', 'rf_template'],
    body: `{
  "site_name": "{{site_name}}",
  "timezone": "{{timezone}}",
  "country_code": "{{country_code}}",
  "rf_template": "{{rf_template}}",
  "switch_config": {
    "management_vlan": "{{management_vlan}}",
    "native_vlan": "{{native_vlan}}"
  }
}`,
  },
  {
    id: 'generic-change-plan',
    name: 'Network change plan',
    vendor: 'Generic',
    platform: 'Text',
    category: 'Documentation',
    description: 'Short operational change plan with validation and rollback sections.',
    language: 'markdown',
    tags: ['change', 'rollback', 'validation'],
    variables: ['ticket_id', 'device_list', 'summary'],
    body: `# {{ticket_id}} - {{summary}}

## Devices
{{device_list}}

## Pre-checks
- Save current running config
- Confirm reachability and console/rollback path
- Capture key service status

## Change steps
1. Apply candidate config
2. Validate logs and routing/switching state
3. Confirm user/service impact

## Rollback
- Restore saved config or apply rollback commands
- Validate restored service state
`,
  },
];

export function templatesForLanguage(language: GreenTextLanguageId): TemplateDefinition[] {
  const directMatches = TEMPLATE_PACKS.filter((template) => template.language === language);
  if (directMatches.length > 0) return directMatches;
  return TEMPLATE_PACKS;
}
