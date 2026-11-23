// Kokoro v1.1 模型官方音色映射：sherpa-onnx kokoro-multi-lang-v1_1
export const KOKORO_VOICES = [
  { id: '0', name: 'af_maple' },
  { id: '1', name: 'af_sol' },
  { id: '2', name: 'bf_vale' },
  { id: '3', name: 'zf_001' },
  { id: '4', name: 'zf_002' },
  { id: '5', name: 'zf_003' },
  { id: '6', name: 'zf_004' },
  { id: '7', name: 'zf_005' },
  { id: '8', name: 'zf_006' },
  { id: '9', name: 'zf_007' },
  { id: '10', name: 'zf_008' },
  { id: '11', name: 'zf_017' },
  { id: '12', name: 'zf_018' },
  { id: '13', name: 'zf_019' },
  { id: '14', name: 'zf_021' },
  { id: '15', name: 'zf_022' },
  { id: '16', name: 'zf_023' },
  { id: '17', name: 'zf_024' },
  { id: '18', name: 'zf_026' },
  { id: '19', name: 'zf_027' },
  { id: '20', name: 'zf_028' },
  { id: '21', name: 'zf_032' },
  { id: '22', name: 'zf_036' },
  { id: '23', name: 'zf_038' },
  { id: '24', name: 'zf_039' },
  { id: '25', name: 'zf_040' },
  { id: '26', name: 'zf_042' },
  { id: '27', name: 'zf_043' },
  { id: '28', name: 'zf_044' },
  { id: '29', name: 'zf_046' },
  { id: '30', name: 'zf_047' },
  { id: '31', name: 'zf_048' },
  { id: '32', name: 'zf_049' },
  { id: '33', name: 'zf_051' },
  { id: '34', name: 'zf_059' },
  { id: '35', name: 'zf_060' },
  { id: '36', name: 'zf_067' },
  { id: '37', name: 'zf_070' },
  { id: '38', name: 'zf_071' },
  { id: '39', name: 'zf_072' },
  { id: '40', name: 'zf_073' },
  { id: '41', name: 'zf_074' },
  { id: '42', name: 'zf_075' },
  { id: '43', name: 'zf_076' },
  { id: '44', name: 'zf_077' },
  { id: '45', name: 'zf_078' },
  { id: '46', name: 'zf_079' },
  { id: '47', name: 'zf_083' },
  { id: '48', name: 'zf_084' },
  { id: '49', name: 'zf_085' },
  { id: '50', name: 'zf_086' },
  { id: '51', name: 'zf_087' },
  { id: '52', name: 'zf_088' },
  { id: '53', name: 'zf_090' },
  { id: '54', name: 'zf_092' },
  { id: '55', name: 'zf_093' },
  { id: '56', name: 'zf_094' },
  { id: '57', name: 'zf_099' },
  { id: '58', name: 'zm_009' },
  { id: '59', name: 'zm_010' },
  { id: '60', name: 'zm_011' },
  { id: '61', name: 'zm_012' },
  { id: '62', name: 'zm_013' },
  { id: '63', name: 'zm_014' },
  { id: '64', name: 'zm_015' },
  { id: '65', name: 'zm_016' },
  { id: '66', name: 'zm_020' },
  { id: '67', name: 'zm_025' },
  { id: '68', name: 'zm_029' },
  { id: '69', name: 'zm_030' },
  { id: '70', name: 'zm_031' },
  { id: '71', name: 'zm_033' },
  { id: '72', name: 'zm_034' },
  { id: '73', name: 'zm_035' },
  { id: '74', name: 'zm_037' },
  { id: '75', name: 'zm_041' },
  { id: '76', name: 'zm_045' },
  { id: '77', name: 'zm_050' },
  { id: '78', name: 'zm_052' },
  { id: '79', name: 'zm_053' },
  { id: '80', name: 'zm_054' },
  { id: '81', name: 'zm_055' },
  { id: '82', name: 'zm_056' },
  { id: '83', name: 'zm_057' },
  { id: '84', name: 'zm_058' },
  { id: '85', name: 'zm_061' },
  { id: '86', name: 'zm_062' },
  { id: '87', name: 'zm_063' },
  { id: '88', name: 'zm_064' },
  { id: '89', name: 'zm_065' },
  { id: '90', name: 'zm_066' },
  { id: '91', name: 'zm_068' },
  { id: '92', name: 'zm_069' },
  { id: '93', name: 'zm_080' },
  { id: '94', name: 'zm_081' },
  { id: '95', name: 'zm_082' },
  { id: '96', name: 'zm_089' },
  { id: '97', name: 'zm_091' },
  { id: '98', name: 'zm_095' },
  { id: '99', name: 'zm_096' },
  { id: '100', name: 'zm_097' },
  { id: '101', name: 'zm_098' },
  { id: '102', name: 'zm_100' },
] as const

/** Kokoro 音色条目类型 */
export type KokoroVoiceItem = (typeof KOKORO_VOICES)[number]

/** 音色分组元信息 */
export interface KokoroVoiceGroup {
  id: 'en-us' | 'en-gb' | 'zh-female' | 'zh-male'
  label: string
  items: Array<{ id: string; rawName: string; displayLabel: string }>
}

/** 音色前缀分组配置表 */
const KOKORO_PREFIX_RULES: ReadonlyArray<{
  prefix: string
  groupId: KokoroVoiceGroup['id']
  groupLabel: string
  formatLabel: (suffix: string, rawName: string) => string
}> = [
  {
    prefix: 'af_',
    groupId: 'en-us',
    groupLabel: '美式英语女声',
    formatLabel: (suffix, rawName) => `${suffix.charAt(0).toUpperCase()}${suffix.slice(1)} · 美式女声 (${rawName})`
  },
  {
    prefix: 'bf_',
    groupId: 'en-gb',
    groupLabel: '英式英语女声',
    formatLabel: (suffix, rawName) => `${suffix.charAt(0).toUpperCase()}${suffix.slice(1)} · 英式女声 (${rawName})`
  },
  {
    prefix: 'zf_',
    groupId: 'zh-female',
    groupLabel: '中文普通话女声',
    formatLabel: (suffix, rawName) => `普通话女声 ${suffix} (${rawName})`
  },
  {
    prefix: 'zm_',
    groupId: 'zh-male',
    groupLabel: '中文普通话男声',
    formatLabel: (suffix, rawName) => `普通话男声 ${suffix} (${rawName})`
  }
]

/**
 * 将 Kokoro 原始音色列表按语种与性别整理为可读分组
 * @returns 分组后的音色目录
 */
export function getGroupedKokoroVoices(): KokoroVoiceGroup[] {
  const groupMap = new Map<KokoroVoiceGroup['id'], KokoroVoiceGroup>()

  for (const rule of KOKORO_PREFIX_RULES) {
    groupMap.set(rule.groupId, { id: rule.groupId, label: rule.groupLabel, items: [] })
  }

  for (const voice of KOKORO_VOICES) {
    const matchedRule = KOKORO_PREFIX_RULES.find((rule) => voice.name.startsWith(rule.prefix))
    if (!matchedRule) {
      continue
    }
    const suffix = voice.name.slice(matchedRule.prefix.length)
    groupMap.get(matchedRule.groupId)?.items.push({
      id: voice.id,
      rawName: voice.name,
      displayLabel: matchedRule.formatLabel(suffix, voice.name)
    })
  }

  return Array.from(groupMap.values()).filter((group) => group.items.length > 0)
}
