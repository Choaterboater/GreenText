import type { GreenTextLanguageId } from '../data/languages';

const arubaBlockStarters = /^(aaa|access-list|class|interface|policy|route-map|router|ssid-profile|user-role|vlan\s+\d+|vrf|vsx|wlan)\b/i;
const arubaTopLevelCommands = /^(hostname|ip\s+route|ipv6\s+route|line\s|logging|ntp|radius|snmp-server|tacacs)\b/i;

function isJunosLike(language: GreenTextLanguageId): boolean {
  return language === 'juniper-junos' || language === 'mist-apstra';
}

function isArubaLike(language: GreenTextLanguageId): boolean {
  return language === 'aruba-cx' || language === 'aruba-aos-s' || language === 'aruba-wireless';
}

function indent(count: number, indentSize: number): string {
  return ' '.repeat(Math.max(0, count) * indentSize);
}

function prettyIndentJunos(lines: string[], indentSize: number): string[] {
  let level = 0;

  return lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (/^[}\])]/.test(trimmed)) level = Math.max(0, level - 1);

    const formatted = `${indent(level, indentSize)}${trimmed}`;
    const opens = (trimmed.match(/[{[(]/g) ?? []).length;
    const closes = (trimmed.match(/[}\])]/g) ?? []).length;
    level = Math.max(0, level + opens - closes);
    return formatted;
  });
}

function prettyIndentAruba(lines: string[], indentSize: number): string[] {
  let inBlock = false;

  return lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed === '!' || /^(exit|end)$/i.test(trimmed)) {
      inBlock = false;
      return trimmed;
    }

    const startsBlock = arubaBlockStarters.test(trimmed);
    const startsTopLevelCommand = arubaTopLevelCommands.test(trimmed) || /^(show|write|copy|reload)\b/i.test(trimmed);
    const lineLevel = startsBlock || startsTopLevelCommand ? 0 : inBlock ? 1 : 0;
    const formatted = `${indent(lineLevel, indentSize)}${trimmed}`;

    if (startsBlock) inBlock = true;
    if (startsTopLevelCommand) inBlock = false;

    return formatted;
  });
}

function prettyIndentGeneric(lines: string[], indentSize: number): string[] {
  let level = 0;

  return lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (/^[}\])]/.test(trimmed)) level = Math.max(0, level - 1);

    const formatted = `${indent(level, indentSize)}${trimmed}`;
    const opens = (trimmed.match(/[{[(]/g) ?? []).length;
    const closes = (trimmed.match(/[}\])]/g) ?? []).length;
    level = Math.max(0, level + opens - closes);
    return formatted;
  });
}

export function prettyIndentText(
  text: string,
  language: GreenTextLanguageId,
  indentSize = 2,
): string {
  const endsWithNewline = text.endsWith('\n');
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (endsWithNewline) lines.pop();

  const formatted = isJunosLike(language)
    ? prettyIndentJunos(lines, indentSize)
    : isArubaLike(language)
      ? prettyIndentAruba(lines, indentSize)
      : prettyIndentGeneric(lines, indentSize);

  return `${formatted.join('\n')}${endsWithNewline ? '\n' : ''}`;
}
