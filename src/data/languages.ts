export type GreenTextLanguageId =
  | 'plaintext'
  | 'aruba-cx'
  | 'aruba-aos-s'
  | 'aruba-wireless'
  | 'juniper-junos'
  | 'mist-apstra'
  | 'json'
  | 'yaml'
  | 'markdown'
  | 'typescript'
  | 'javascript'
  | 'html'
  | 'css'
  | 'shell'
  | 'python';

export interface LanguageDefinition {
  id: GreenTextLanguageId;
  label: string;
  group: 'Network' | 'General';
  extensions: string[];
  aliases: string[];
  keywords: string[];
  lineComment: string;
  builtIn?: boolean;
}

const arubaCommon = [
  'aaa',
  'access-list',
  'address-family',
  'apply',
  'class',
  'configure',
  'copy',
  'description',
  'dhcp',
  'dns',
  'exit',
  'gateway',
  'hostname',
  'interface',
  'ip',
  'ipv6',
  'lacp',
  'lldp',
  'logging',
  'mac-address',
  'mtu',
  'name',
  'neighbor',
  'no',
  'ntp',
  'policy',
  'qos',
  'radius',
  'reload',
  'router',
  'show',
  'snmp-server',
  'spanning-tree',
  'static',
  'tagged',
  'trunk',
  'untagged',
  'vlan',
  'vrf',
  'vsx',
  'write',
];

const wirelessCommon = [
  'aaa-profile',
  'airgroup',
  'ap-group',
  'ap-name',
  'auth-server',
  'cluster',
  'commit',
  'dot11a',
  'dot11g',
  'iap-master',
  'lms-ip',
  'radio-profile',
  'role',
  'ssid-profile',
  'swarm',
  'user-role',
  'virtual-ap',
  'virtual-controller',
  'wlan',
];

const junosCommon = [
  'apply-groups',
  'chassis',
  'class-of-service',
  'commit',
  'community',
  'delete',
  'display',
  'edit',
  'family',
  'firewall',
  'interfaces',
  'policy-options',
  'protocols',
  'replace',
  'rollback',
  'routing-instances',
  'routing-options',
  'security',
  'set',
  'show',
  'system',
  'then',
  'unit',
  'vlans',
];

export const GREEN_TEXT_LANGUAGES: LanguageDefinition[] = [
  {
    id: 'aruba-cx',
    label: 'Aruba CX',
    group: 'Network',
    extensions: ['.cfg', '.conf', '.cli', '.arubacx'],
    aliases: ['Aruba CX', 'AOS-CX'],
    keywords: [...arubaCommon, 'evpn', 'vxlan', 'vni', 'evi', 'svi', 'route-map'],
    lineComment: '!',
  },
  {
    id: 'aruba-aos-s',
    label: 'Aruba AOS-S',
    group: 'Network',
    extensions: ['.aoss', '.procurve', '.switchcfg'],
    aliases: ['Aruba AOS-S', 'ProCurve'],
    keywords: [...arubaCommon, 'ip-helper-address', 'management-vlan', 'mesh', 'voice'],
    lineComment: '!',
  },
  {
    id: 'aruba-wireless',
    label: 'Aruba Wireless',
    group: 'Network',
    extensions: ['.arubaap', '.aos8', '.iap'],
    aliases: ['Aruba AP', 'Aruba Controller', 'Instant AP', 'AOS 8'],
    keywords: [...arubaCommon, ...wirelessCommon],
    lineComment: '!',
  },
  {
    id: 'juniper-junos',
    label: 'Juniper Junos',
    group: 'Network',
    extensions: ['.junos', '.juniper', '.set'],
    aliases: ['Junos', 'Juniper'],
    keywords: [...junosCommon, 'ge-0', 'xe-0', 'et-0', 'irb', 'lo0', 'no-more'],
    lineComment: '#',
  },
  {
    id: 'mist-apstra',
    label: 'Mist / Apstra',
    group: 'Network',
    extensions: ['.mist', '.apstra', '.jsonnet'],
    aliases: ['Mist', 'Apstra'],
    keywords: [...junosCommon, 'blueprint', 'configlet', 'deviceprofile', 'intent', 'template'],
    lineComment: '#',
  },
  {
    id: 'plaintext',
    label: 'Plain Text',
    group: 'General',
    extensions: ['.txt', '.log'],
    aliases: ['Plain Text'],
    keywords: [],
    lineComment: '#',
    builtIn: true,
  },
  {
    id: 'json',
    label: 'JSON',
    group: 'General',
    extensions: ['.json', '.jsonc'],
    aliases: ['JSON'],
    keywords: [],
    lineComment: '//',
    builtIn: true,
  },
  {
    id: 'yaml',
    label: 'YAML',
    group: 'General',
    extensions: ['.yaml', '.yml'],
    aliases: ['YAML'],
    keywords: [],
    lineComment: '#',
    builtIn: true,
  },
  {
    id: 'markdown',
    label: 'Markdown',
    group: 'General',
    extensions: ['.md', '.markdown'],
    aliases: ['Markdown'],
    keywords: [],
    lineComment: '<!--',
    builtIn: true,
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    group: 'General',
    extensions: ['.ts', '.tsx'],
    aliases: ['TypeScript'],
    keywords: [],
    lineComment: '//',
    builtIn: true,
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    group: 'General',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    aliases: ['JavaScript'],
    keywords: [],
    lineComment: '//',
    builtIn: true,
  },
  {
    id: 'html',
    label: 'HTML',
    group: 'General',
    extensions: ['.html', '.htm'],
    aliases: ['HTML'],
    keywords: [],
    lineComment: '<!--',
    builtIn: true,
  },
  {
    id: 'css',
    label: 'CSS',
    group: 'General',
    extensions: ['.css', '.scss'],
    aliases: ['CSS'],
    keywords: [],
    lineComment: '/*',
    builtIn: true,
  },
  {
    id: 'shell',
    label: 'Shell',
    group: 'General',
    extensions: ['.sh', '.bash', '.zsh'],
    aliases: ['Shell'],
    keywords: [],
    lineComment: '#',
    builtIn: true,
  },
  {
    id: 'python',
    label: 'Python',
    group: 'General',
    extensions: ['.py'],
    aliases: ['Python'],
    keywords: [],
    lineComment: '#',
    builtIn: true,
  },
];

const extensionToLanguage = new Map<string, GreenTextLanguageId>(
  GREEN_TEXT_LANGUAGES.flatMap((language) =>
    language.extensions.map((extension) => [extension, language.id] as const),
  ),
);

export function languageLabel(id: GreenTextLanguageId): string {
  return GREEN_TEXT_LANGUAGES.find((language) => language.id === id)?.label ?? id;
}

export function detectLanguage(fileName: string, content = ''): GreenTextLanguageId {
  const lowerName = fileName.toLowerCase();
  const sample = content.slice(0, 8000).toLowerCase();
  if (/\bset interfaces\b|\bcommit confirmed\b|\bfamily inet\b|\bdisplay set\b/.test(sample)) {
    return 'juniper-junos';
  }
  if (/\bvirtual-controller\b|\bssid-profile\b|\bap-group\b|\bwlan virtual-ap\b/.test(sample)) {
    return 'aruba-wireless';
  }
  if (/\buntagged\b|\btagged\b|\bmanagement-vlan\b/.test(sample)) {
    return 'aruba-aos-s';
  }
  if (/\bvsx\b|\bevpn\b|\binterface 1\/\d+\/\d+\b|\bvlan trunk\b/.test(sample)) {
    return 'aruba-cx';
  }
  if (/\bblueprint\b|\bconfiglet\b|\bmist\b|\bapstra\b/.test(sample)) {
    return 'mist-apstra';
  }

  const extensionMatch = lowerName.match(/\.[^.]+$/);
  if (extensionMatch) {
    const byExtension = extensionToLanguage.get(extensionMatch[0]);
    if (byExtension) return byExtension;
  }

  return 'plaintext';
}
