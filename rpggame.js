import React, { useState, useEffect, useRef } from 'react';
import { Shield, Sword, Heart, Zap, Skull, Tent, ArrowRight, Plus, X, Info, Coins, Backpack, Store, Sparkles, Hammer, ArrowUpCircle, Home, Mountain, Flame, TreePine, Target, BookHeart, Users, Sun, Moon, Lock } from 'lucide-react';

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'legendary', 'epic', 'mythic'];
const RARITY_MAP = {
    common: { name: '平凡', color: 'text-gray-400', border: 'border-gray-600', bg: 'bg-gray-800' },
    uncommon: { name: '罕見', color: 'text-green-400', border: 'border-green-600', bg: 'bg-green-950/30' },
    rare: { name: '稀有', color: 'text-blue-400', border: 'border-blue-600', bg: 'bg-blue-950/30' },
    legendary: { name: '傳奇', color: 'text-purple-400', border: 'border-purple-600', bg: 'bg-purple-950/30' },
    epic: { name: '史詩', color: 'text-yellow-400', border: 'border-yellow-600', bg: 'bg-yellow-950/30' },
    mythic: { name: '神話', color: 'text-red-500', border: 'border-red-600', bg: 'bg-red-950/30' }
};
const MAT_PRICES = {
    common: 10,
    uncommon: 25,
    rare: 50,
    legendary: 100,
    epic: 200,
    mythic: 500
};
const TXT = (text) => text || '';
const FMT = (text) => {
    if (typeof text !== 'string') return text;
    return FMT_ARRAY(text);
};

const renderBonusWithTooltip = (val, colorClass, tooltipText, key) => {
    return (
        <span key={key} className={`inline-block font-bold ${colorClass} mx-1 group/tooltip relative cursor-help border-b border-dashed border-current`}>
            {val}
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-y-1/2 mb-1 hidden group-hover/tooltip:block bg-gray-950 text-white text-[10px] py-1 px-2 rounded shadow-xl whitespace-nowrap z-50">
                {tooltipText}
            </span>
        </span>
    );
};

const parseDynamicDesc = (descString, stats) => {
    return renderDynamicDesc(descString, stats);
};

// ==========================================
// 1. 遊戲資料庫 (Data Dictionary) & 初始化
// ==========================================

let _popupIdCounter = 0;
function getPopupId() {
    _popupIdCounter += 1;
    return `popup_${Date.now()}_${_popupIdCounter}`;
}

const ROLE_ICONS = { knight: '♞', queen: '♛', rook: '♜', bishop: '♝', king: '♚' };
const ELEMENT_COLORS = { '水': 'text-blue-400', '火': 'text-red-500', '風': 'text-green-400', '土': 'text-amber-700', '光': 'text-yellow-400', '暗': 'text-purple-500' };
const ELEM_ADV = { '水': '火', '火': '風', '風': '土', '土': '水', '光': '暗', '暗': '光' };

const STAT_LABEL_COLORS = {
    '物理攻擊': 'text-orange-400',
    '魔法攻擊': 'text-purple-400',
    '物理防禦': 'text-yellow-400',
    '魔法防禦': 'text-cyan-400',
    '最大生命': 'text-white',
    '生命值': 'text-green-400',
    '生命': 'text-green-400',
    '受到的傷害': 'text-red-400',
    '傷害': 'text-red-400',
    '暴擊率': 'text-yellow-300',
    'DA': 'text-red-400',
    'TA': 'text-red-400',
    'DA率': 'text-red-400',
    'TA率': 'text-red-400'
};

const FMT_ARRAY = (text) => {
    if (!text || typeof text !== 'string') return [];
    const regex = /(【.*?】|物理攻擊|魔法攻擊|物理防禦|魔法防禦|暴擊率|DA率|TA率)/g;
    return text.split(regex).map((part, i) => {
        if (part.startsWith('【') && part.endsWith('】')) return <em key={i} className="italic text-cyan-300">{part}</em>;
        if (['物理攻擊', '魔法攻擊', '物理防禦', '魔法防禦', '暴擊率', 'DA率', 'TA率'].includes(part)) {
            const cl = STAT_LABEL_COLORS[part] || 'text-white';
            return <strong key={i} className={`font-bold ${cl} drop-shadow-sm`}>{part}</strong>;
        }
        return part;
    });
};

const renderDynamicDesc = (descString, stats) => {
    if (!descString || typeof descString !== 'string') return descString;
    
    // 支援 [[formula:labelText]] 與 [statKey:formulaAndLabel] 格式
    const regex = /\[\[([^\]:]+):([^\]]+)\]\]|\[([a-zA-Z_]+):([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let keyCounter = 0;
    
    while ((match = regex.exec(descString)) !== null) {
        const index = match.index;
        if (index > lastIndex) {
            const rawSub = descString.substring(lastIndex, index);
            const formatted = FMT_ARRAY(rawSub);
            formatted.forEach(el => {
                if (React.isValidElement(el)) {
                    parts.push(React.cloneElement(el, { key: `dyn-txt-${keyCounter++}` }));
                } else {
                    parts.push(el);
                }
            });
        }
        
        let isDoubleBracket = match[1] !== undefined;
        let formulaStr = "";
        let labelStr = "";
        let statKeyRaw = "";

        if (isDoubleBracket) {
            formulaStr = match[1];
            labelStr = match[2];
            
            if (formulaStr.toLowerCase().includes('atk') || labelStr.includes('攻擊')) {
                statKeyRaw = formulaStr.toLowerCase().includes('matk') ? 'mAtk' : 'pAtk';
            } else if (formulaStr.toLowerCase().includes('def') || labelStr.includes('防禦')) {
                statKeyRaw = formulaStr.toLowerCase().includes('mdef') ? 'mDef' : 'pDef';
            } else if (formulaStr.toLowerCase().includes('hp') || labelStr.includes('生命')) {
                statKeyRaw = 'maxHp';
            } else if (formulaStr.toLowerCase().includes('stacks') || labelStr.includes('層')) {
                statKeyRaw = 'stacks';
            } else if (formulaStr.toLowerCase().includes('duration') || labelStr.includes('回合')) {
                statKeyRaw = 'duration';
            } else {
                statKeyRaw = 'pAtk';
            }
        } else {
            statKeyRaw = match[3];
            labelStr = match[4];
            
            let sKey = statKeyRaw.toLowerCase();
            if (sKey === 'patk' || sKey === 'atk') sKey = 'pAtk';
            else if (sKey === 'matk') sKey = 'mAtk';
            else if (sKey === 'pdef') sKey = 'pDef';
            else if (sKey === 'mdef') sKey = 'mDef';
            else if (sKey === 'maxhp' || sKey === 'hp') sKey = 'maxHp';
            else if (sKey === 'stacks') sKey = 'stacks';
            else if (sKey === 'duration') sKey = 'duration';

            let formula = labelStr
                .replace(/物理攻擊/g, `* ${sKey}`)
                .replace(/魔法攻擊/g, `* ${sKey}`)
                .replace(/物理防禦/g, `* ${sKey}`)
                .replace(/魔法防禦/g, `* ${sKey}`)
                .replace(/最大生命/g, `* ${sKey}`)
                .replace(/生命/g, `* ${sKey}`)
                .replace(/層數/g, `* ${sKey}`)
                .replace(/持續回合/g, `* ${sKey}`)
                .replace(/%/g, '');
                
            formula = formula.trim();
            if (formula.startsWith('*')) {
                formula = `${sKey} ${formula}`;
            } else if (!formula.includes(sKey)) {
                if (!isNaN(Number(formula))) {
                    formula = `${formula} * ${sKey}`;
                } else {
                    const trailingNumMatch = formula.match(/([\d\.]+)$/);
                    if (trailingNumMatch) {
                        formula = formula.replace(/([\d\.]+)$/, `$1 * ${sKey}`);
                    } else {
                        formula = `${formula} * ${sKey}`;
                    }
                }
            }
            formulaStr = formula;
        }
        
        let statKey = statKeyRaw.toLowerCase();
        if (statKey === 'patk' || statKey === 'atk') statKey = 'pAtk';
        else if (statKey === 'matk') statKey = 'mAtk';
        else if (statKey === 'pdef') statKey = 'pDef';
        else if (statKey === 'mdef') statKey = 'mDef';
        else if (statKey === 'maxhp' || statKey === 'hp') statKey = 'maxHp';
        else if (statKey === 'stacks') statKey = 'stacks';
        else if (statKey === 'duration') statKey = 'duration';
        
        let calculatedVal = 0;
        try {
            const contextAtk = stats?.pAtk || stats?.atk || 0;
            const contextMatk = stats?.mAtk || stats?.matk || 0;
            const contextPdef = stats?.pDef || stats?.pdef || 0;
            const contextMdef = stats?.mDef || stats?.mdef || 0;
            const contextMaxHp = stats?.maxHp || 0;
            const contextStacks = stats?.stacks || 1;
            const contextDuration = stats?.duration || 0;
            
            let evalFormula = formulaStr
                .replace(/\bmAtk\b/gi, contextMatk)
                .replace(/\bmatk\b/gi, contextMatk)
                .replace(/\b(patk|atk|pAtk)\b/gi, contextAtk)
                .replace(/\bmdef\b/gi, contextMdef)
                .replace(/\bmDef\b/gi, contextMdef)
                .replace(/\b(pdef|def|pDef)\b/gi, contextPdef)
                .replace(/\b(maxhp|hp|maxHp)\b/gi, contextMaxHp)
                .replace(/\bstacks\b/gi, contextStacks)
                .replace(/\bduration\b/gi, contextDuration);
                
            const result = new Function('return ' + evalFormula)();
            calculatedVal = Math.floor(result);
        } catch (e) {
            console.warn("Formula evaluation failed:", formulaStr, e);
        }
        
        const colorMap = {
            'patk': 'text-orange-400',
            'pAtk': 'text-orange-400',
            'matk': 'text-purple-400',
            'mAtk': 'text-purple-400',
            'pdef': 'text-yellow-400',
            'pDef': 'text-yellow-400',
            'mdef': 'text-cyan-400',
            'mDef': 'text-cyan-400',
            'maxHp': 'text-white',
            'stacks': 'text-gray-300',
            'duration': 'text-gray-300'
        };
        const colorClass = colorMap[statKey] || 'text-cyan-300';
        
        const displayText = calculatedVal.toString();
        const tooltipText = `${labelStr} `;
        
        parts.push(renderBonusWithTooltip(displayText, colorClass, tooltipText, `dyn-bonus-${keyCounter++}`));
        
        lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < descString.length) {
        const rawSub = descString.substring(lastIndex);
        const formatted = FMT_ARRAY(rawSub);
        formatted.forEach(el => {
            if (React.isValidElement(el)) {
                parts.push(React.cloneElement(el, { key: `dyn-txt-${keyCounter++}` }));
            } else {
                parts.push(el);
            }
        });
    }
    
    return parts;
};

const EQ_TYPES = ['weapon', 'head', 'body', 'shoes', 'accessory'];
const EQ_ICONS = { weapon: '⚔️ 武器', head: '🪖 頭部', body: '👕 身體', shoes: '🥾 腳部', accessory: '💍 飾品' };
const EQ_MINI_ICONS = { weapon: '⚔️', head: '🪖', body: '👕', shoes: '🥾', accessory: '💍' };

const ASSET_VERSION = 'v1.0.0'; // 修改這個版號可以強制重新抓取所有圖片，破壞 CDN 的舊快取

function getImgUrl(url) {
    if (!url) return url;
    let finalUrl = url;
    // 將 raw 自動轉換為 cdn，享受更快的讀取速度與防範被 GitHub 限流
    if (finalUrl.includes('raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/')) {
        finalUrl = finalUrl.replace('raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/', 'cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/');
    }
    // 加上版號強制破壞舊快取
    return finalUrl.includes('?') ? `${finalUrl}&v=${ASSET_VERSION}` : `${finalUrl}?v=${ASSET_VERSION}`;
}

function getRoleIconUrl(role, element) {
    const elMap = { '水': 'water', '火': 'fire', '風': 'wind', '土': 'earth', '光': 'light', '暗': 'dark' };
    return getImgUrl(`https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/CLASS/${role}-${elMap[element]}.png`);
}

function getSkillIconUrl(skillId) {
    return getImgUrl(`https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/SKILLICON/${skillId}.jpg`);
}

const getBuffIconUrl = (buffType) => {
    return getImgUrl(`https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/BUFF/${buffType}.png`);
}

// BUFF 核心邏輯層與 Modifier 定義 - 所有特定描述與公式全部交由 buffdb.json 管理與解析
let BUFF_DB = {};
const BUFF_LOGIC = {
  pAtkUp: { modifiers: { pAtkPct: 'val' } },
  mAtkUp: { modifiers: { mAtkPct: 'val' } },
  pDefUp: { modifiers: { pDefPct: 'val' } },
  mDefUp: { modifiers: { mDefPct: 'val' } },
  pAtkDown: { modifiers: { pAtkPct: '-val' } },
  mAtkDown: { modifiers: { mAtkPct: '-val' } },
  pDefDown: { modifiers: { pDefPct: '-val' } },
  mDefDown: { modifiers: { mDefPct: '-val' } },
  critUp: { modifiers: { crit: 'val' } },
  daUp: { modifiers: { da: 'val' } },
  taUp: { modifiers: { ta: 'val' } },
  critDown: { modifiers: { crit: '-val' } },
  daDown: { modifiers: { da: '-val' } },
  taDown: { modifiers: { ta: '-val' } },
  regen: {},
  taunt: {},
  devotion: {},
  kingAura: {},
  queenSpikes: {},
  fierceKnight: {},
  holyBless: {},
  fortress: {},
  breaker: {},
  critDmgUp: { modifiers: { critDmg: 'val' } },
  frostburn: {},
  iceCrystal: { effectType: 'silence', isControl: true },
  silence: { effectType: 'silence', isControl: true }
};
const SIMPLE_BUFFS = ['pAtkUp', 'mAtkUp', 'pDefUp', 'mDefUp', 'pDefDown', 'mDefDown', 'pAtkDown', 'mAtkDown', 'critUp', 'daUp', 'taUp', 'critDmgUp'];

const CASTER_SCALING_BUFFS = ['regen', 'burn', 'spellblight', 'frostburn']; // 定義需要鎖定施法者體質的動態狀態

const isSilenced = (entity) => {
    if (!entity || !entity.buffs) return false;
    return entity.buffs.some(b => {
        const bDef = BUFF_DB[b.type];
        return b.type === 'iceCrystal' || b.type === 'silence' || (bDef && bDef.effectType === 'silence');
    });
};

// ==========================================
// 狀態疊加輔助函式
// ==========================================
function addBuffToEntity(target, b) {
    if (!target || target.baseStats.hp <= 0) return;
    
    // 如果未設定時效，優先從資料庫獲取該狀態的預設值
    if (b.duration === undefined || b.duration === null) {
        const bDef = BUFF_DB[b.type];
        if (bDef && bDef.duration !== undefined) {
            b.duration = bDef.duration;
        }
    }
    
    // 單純體質增減的狀態不疊加回合與數值，允許共存多個獨立狀態
    if (SIMPLE_BUFFS.includes(b.type)) {
        target.buffs.push(JSON.parse(JSON.stringify(b)));
        return;
    }

    const bDef = BUFF_DB[b.type] || {};
    const maxS = bDef.maxStacks !== undefined ? bDef.maxStacks : (b.type === 'fortress' ? 12 : 99);

    let ex = target.buffs.find(x => x.type === b.type);
    if (ex) {
        if (b.stacks !== undefined) ex.stacks += b.stacks;
        if (b.duration !== undefined) {
            if (ex.duration !== 99 && ex.duration !== 999) {
                if (b.type === 'burn') {
                    ex.duration = b.duration; // 灼燒疊加時重新整理時效，防止無限疊加持續時間
                } else {
                    ex.duration += b.duration;
                }
            }
        }
        if (b.val !== undefined && b.val > (ex.val || 0)) ex.val = b.val;
        
        // 刷新施放者綁定
        if (b.casterId) ex.casterId = b.casterId;
        if (b.casterSide) ex.casterSide = b.casterSide;

        // 限制層數不超過上限
        if (ex.stacks > maxS) ex.stacks = maxS;
    } else {
        let newBuff = JSON.parse(JSON.stringify(b));
        if (newBuff.stacks > maxS) newBuff.stacks = maxS;
        target.buffs.push(newBuff);
    }
}

// ==========================================
// 1. 遊戲資料庫 (Data Dictionary) & 初始化
// ==========================================

// ==========================================
// 技能通用邏輯派發器
// ==========================================
function applySkillBuffs(state, skillDef, cIdx, tIdx, casterSide = 'party', tiers = {}, eqSt = {}, runState = {}) {
  let popups = [];
  let caster = state[casterSide][cIdx];
  let casterId = caster ? caster.id : null;
  // 快照：在施加狀態的當下，精確擷取施法者包含階級、穿搭裝備與全局 Buff 的完整體質
  let casterStatsSnapshot = caster ? getStats(caster, casterSide === 'party', tiers, eqSt, runState) : null;

  const getIndividualTargets = (targetType) => {
      const targets = [];
      if (targetType === 'self') {
          if (state.party[cIdx]) targets.push({ ref: state.party[cIdx], idx: cIdx, side: 'party' });
      } else if (targetType === 'player_all' || targetType === 'all_allies') {
          state.party.forEach((p, i) => {
              if (p && p.baseStats.hp > 0) targets.push({ ref: p, idx: i, side: 'party' });
          });
      } else if (targetType === 'player_single') {
          const idx = (skillDef.targetType === 'player_single') ? tIdx : cIdx;
          if (state.party[idx]) targets.push({ ref: state.party[idx], idx, side: 'party' });
      } else if (targetType === 'enemy_all') {
          state.enemies.forEach((e, i) => {
              if (e && e.baseStats.hp > 0) targets.push({ ref: e, idx: i, side: 'enemy' });
          });
      } else if (targetType === 'enemy_single') {
          if (state.enemies[tIdx]) targets.push({ ref: state.enemies[tIdx], idx: tIdx, side: 'enemy' });
      }
      return targets;
  };

  if (skillDef.applyBuffs) {
      skillDef.applyBuffs.forEach((b, bIdx) => {
          // 優先採用個別 Buff 標註的 target，若無則使用技能的 targetType
          const targetType = b.target || skillDef.targetType;
          const targets = getIndividualTargets(targetType);
          targets.forEach(t => {
              if (t.ref && t.ref.baseStats.hp > 0) {
                  // 將體質快照綁定進入 buff 物件中
                  addBuffToEntity(t.ref, { ...b, casterId, casterSide, casterStats: casterStatsSnapshot });
                  popups.push({
                      side: t.side,
                      idx: t.idx,
                      text: b.type,
                      isBuff: true,
                      isDebuff: false,
                      delay: bIdx * 300
                  });
              }
          });
      });
  }

  if (skillDef.applyDebuffs) {
      skillDef.applyDebuffs.forEach((b, bIdx) => {
          // 優先採用個別 Debuff 標註的 target，若無則依據原技能 targetType 來判定敵方對象
          let targetType = b.target;
          if (!targetType) {
              if (skillDef.targetType === 'player_all' || skillDef.targetType === 'enemy_all') {
                  targetType = 'enemy_all';
              } else if (skillDef.targetType === 'enemy_single') {
                  targetType = 'enemy_single';
              } else {
                  targetType = 'enemy_single';
              }
          }
          const targets = getIndividualTargets(targetType);
          targets.forEach(t => {
              if (t.ref && t.ref.baseStats.hp > 0) {
                  addBuffToEntity(t.ref, { ...b, casterId, casterSide, casterStats: casterStatsSnapshot });
                  popups.push({
                      side: t.side,
                      idx: t.idx,
                      text: b.type,
                      isBuff: true,
                      isDebuff: true,
                      delay: bIdx * 300
                  });
              }
          });
      });
  }

  return popups;
}

let SKILL_DB = {};

// 萬用動態技能運算器 - 根據 JSON 設定的 Formula 進行戰鬥中實時公式代入與目標結算，實現全動態讀取
const executeDynamicSkill = (state, cIdx, tIdx, tiers, eqSt, runState, applyDmgFn, skillDef) => {
  let popups = [];
  let caster = state.party[cIdx];
  if (!caster) return { logMsg: "無效的施法者", popups };
  
  let cStats = getStats(caster, true, tiers, eqSt, runState);
  let logMsg = skillDef.logOverride || `${skillDef.name} 發動！`;

  // 先施加技能定義中的狀態 (Buffs/Debuffs)
  let buffPopups = applySkillBuffs(state, skillDef, cIdx, tIdx, 'party', tiers, eqSt, runState);
  popups.push(...buffPopups);

  // 重新整理體質：確保如 s_C005_1ex 等技能先提升雙防後，後續的護盾或治療公式能依據「提升後」的面板參數進行結算
  cStats = getStats(caster, true, tiers, eqSt, runState);

  // 取得運算目標之輔助函式
  const getIndividualTargets = (targetType, defaultIdx) => {
      const targets = [];
      const t = targetType ? targetType.toLowerCase() : '';
      if (t === 'self') {
          if (state.party[cIdx]) targets.push({ ref: state.party[cIdx], idx: cIdx, side: 'party' });
      } else if (t === 'player_all' || t === 'all_allies' || t === 'party_all' || t === 'ally_all') {
          state.party.forEach((p, i) => {
              if (p && p.baseStats.hp > 0) targets.push({ ref: p, idx: i, side: 'party' });
          });
      } else if (t === 'player_single' || t === 'party_single' || t === 'ally_single') {
          const idx = (defaultIdx !== null && defaultIdx !== undefined) ? defaultIdx : cIdx;
          if (state.party[idx]) targets.push({ ref: state.party[idx], idx, side: 'party' });
      } else if (t === 'enemy_all' || t === 'all_enemies' || t === 'enemy_side_all') {
          state.enemies.forEach((e, i) => {
              if (e && e.baseStats.hp > 0) targets.push({ ref: e, idx: i, side: 'enemy' });
          });
      } else if (t === 'enemy_single' || t === 'single_enemy') {
          const idx = (defaultIdx !== null && defaultIdx !== undefined) ? defaultIdx : 0;
          if (state.enemies[idx]) targets.push({ ref: state.enemies[idx], idx, side: 'enemy' });
      }
      return targets;
  };

  // 執行動態 JS 公式代入（支援數字、物件、純字串公式）
  const evalFormula = (val, stats) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'object') {
          if (val.formula) return evalFormula(val.formula, stats);
          if (val.base !== undefined || val.factors) {
              let base = val.base || 0;
              if (val.factors && Array.isArray(val.factors)) {
                  base += val.factors.reduce((sum, f) => {
                      let sKey = f.stat;
                      if (sKey === 'atk' || sKey === 'patk') sKey = 'pAtk';
                      else if (sKey === 'matk') sKey = 'mAtk';
                      else if (sKey === 'pdef') sKey = 'pDef';
                      else if (sKey === 'mdef') sKey = 'mDef';
                      else if (sKey === 'maxhp' || sKey === 'hp') sKey = 'maxHp';

                      const multiplier = f.value !== undefined ? f.value : (f.val !== undefined ? f.val : 0);
                      return sum + (stats[sKey] || 0) * multiplier;
                  }, 0);
              }
              return Math.floor(base);
          }
          return 0;
      }
      
      try {
          const contextAtk = stats?.pAtk || stats?.atk || 0;
          const contextMatk = stats?.mAtk || stats?.matk || 0;
          const contextPdef = stats?.pDef || stats?.pdef || 0;
          const contextMdef = stats?.mDef || stats?.mdef || 0;
          const contextMaxHp = stats?.maxHp || 0;
          
          let expr = val.toString()
              .replace(/\bmAtk\b/gi, contextMatk)
              .replace(/\bmAtk\b/gi, contextMatk)
              .replace(/\b(patk|atk|pAtk)\b/gi, contextAtk)
              .replace(/\bmdef\b/gi, contextMdef)
              .replace(/\bmDef\b/gi, contextMdef)
              .replace(/\b(pdef|def|pDef)\b/gi, contextPdef)
              .replace(/\b(maxhp|hp|maxHp)\b/gi, contextMaxHp);
              
          return Math.floor(new Function('return ' + expr)());
      } catch (e) {
          console.warn("Formula evaluation failed:", val, e);
          return 0;
      }
  };

  // 1. 動態治療結算（相容 healFormula, heal, healing, healingFormula, healScaling 等欄位）
  const healFormula = skillDef.healFormula || skillDef.heal || skillDef.healing || skillDef.healingFormula || skillDef.healScaling;
  if (healFormula) {
      let tType = skillDef.healTarget || skillDef.target || skillDef.targetType;
      let targets = getIndividualTargets(tType, tIdx);
      targets.forEach(t => {
          if (t.ref && t.ref.baseStats.hp > 0) {
              let healAmt = evalFormula(healFormula, cStats);
              let res = applyHeal(t.ref, healAmt, t.side === 'party', tiers, eqSt, runState, cStats);
              let color = res.isCrit ? 'text-green-300 font-black scale-125 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'text-green-400 font-bold scale-110';
              let badges = res.isCrit ? [{text: 'CRITICAL', color: 'text-green-300 drop-shadow-md'}] : [];
              popups.push({
                  side: t.side,
                  idx: t.idx,
                  text: `+${res.val}`,
                  color,
                  badges
              });
          }
      });
  }

  // 2. 動態護盾結算（相容 shieldFormula, shield, shieldScaling 等欄位）
  const shieldFormula = skillDef.shieldFormula || skillDef.shield || skillDef.shieldScaling || skillDef.shieldVal;
  if (shieldFormula) {
      let tType = skillDef.shieldTarget || skillDef.target || skillDef.targetType;
      let targets = getIndividualTargets(tType, tIdx);
      let duration = null;
      if (typeof shieldFormula === 'object' && shieldFormula !== null) {
          if (shieldFormula.duration !== undefined) duration = shieldFormula.duration;
          else if (shieldFormula.factors && Array.isArray(shieldFormula.factors)) {
              const fWithDuration = shieldFormula.factors.find(f => f.duration !== undefined);
              if (fWithDuration) duration = fWithDuration.duration;
          }
      }
      targets.forEach(t => {
          if (t.ref && t.ref.baseStats.hp > 0) {
              let sAmt = evalFormula(shieldFormula, cStats);
              if (duration !== null) {
                  t.ref.baseStats.tempShields = t.ref.baseStats.tempShields || [];
                  t.ref.baseStats.tempShields.push({ amt: sAmt, duration: duration });
              } else {
                  t.ref.baseStats.permShield = (t.ref.baseStats.permShield || 0) + sAmt;
              }
              t.ref.baseStats.shield = (t.ref.baseStats.permShield || 0) + (t.ref.baseStats.tempShields || []).reduce((sum, s) => sum + s.amt, 0);
              
              popups.push({
                  side: t.side,
                  idx: t.idx,
                  text: `護盾 +${sAmt}${duration ? ` (${duration}T)` : ''}`,
                  color: 'text-white font-bold scale-110 drop-shadow-md',
                  delay: 100
              });
          }
      });
  }

  // 3. 動態物理/魔法傷害傷害結算（相容 damageFormula, damage, dmg, damageScaling 等欄位）
  const damageFormula = skillDef.damageFormula || skillDef.damage || skillDef.dmg || skillDef.damageScaling;
  if (damageFormula) {
      let tType = skillDef.damageTarget || skillDef.target || skillDef.targetType;
      let targets = getIndividualTargets(tType, tIdx);
      targets.forEach(t => {
          if (t.ref && t.ref.baseStats.hp > 0) {
              let dmgAmt = evalFormula(damageFormula, cStats);
              let dmgObj = calcDamage(caster, t.ref, caster.type, 1.0, true, t.side === 'party', tiers, eqSt, runState, dmgAmt);
              applyDmgFn(t.side, t.idx, dmgObj, 'party', cIdx);
          }
      });
  }

  // 4. 動態 EP 能量結算（相容 energyFormula, energy, ep, epRestore, energyRestore 等欄位）
  const energyFormula = skillDef.energyFormula || skillDef.energy || skillDef.ep || skillDef.epRestore || skillDef.energyRestore;
  if (energyFormula) {
      let tType = skillDef.energyTarget || skillDef.target || 'self';
      if (typeof energyFormula === 'object' && energyFormula !== null) {
          if (energyFormula.target) tType = energyFormula.target;
      }
      let targets = getIndividualTargets(tType, tIdx);
      targets.forEach(t => {
          if (t.ref && t.ref.baseStats.hp > 0) {
              let epAmt = evalFormula(energyFormula, cStats);
              t.ref.energy = Math.min(100, t.ref.energy + epAmt);
              popups.push({
                  side: t.side,
                  idx: t.idx,
                  text: `+${epAmt} EP`,
                  color: 'text-yellow-400 font-bold drop-shadow-md',
                  delay: 150
              });
          }
      });
  }

  return { logMsg, popups };
};

let ULT_DB = {};
const ULT_LOGIC = {
  'u_C001': { calcBaseDmg: (stats) => 150 + (1.2 * stats.atk), descFn: (stats) => { const b = Math.round(1.2*(stats?.atk||0)); const d = 150+b; return <>{FMT('對敵單體造成 3 ')}<span className="text-red-500 font-bold">hits</span>{FMT(' 150+')}{renderBonusWithTooltip(b, "text-orange-400", "1.2 物攻")}{FMT(` 傷害(總: ${d*3})，減物防25%(2T)`)}</>; } },
  'u_C002': { calcBaseDmg: (stats) => 300 + (1.0 * stats.matk), descFn: (stats) => { const b = Math.round(1.0*(stats?.matk||0)); const d = 300+b; return <>{FMT('對敵全體造成 1 ')}<span className="text-red-500 font-bold">hit</span>{FMT(' 300+')}{renderBonusWithTooltip(b, "text-purple-400", "1.0 魔攻")}{FMT(` 傷害(總: ${d})，全體【魔后】1層`)}</>; } },
  'u_C003': { calcBaseDmg: (stats) => 100 + (0.8 * stats.atk), descFn: (stats) => { const b = Math.round(0.8*(stats?.atk||0)); const d = 100+b; return <>{FMT('對敵單體造成 6 ')}<span className="text-red-500 font-bold">hits</span>{FMT(' 100+')}{renderBonusWithTooltip(b, "text-orange-400", "0.8 物攻")}{FMT(` 傷害(總: ${d*6})，減雙防50%(1T)`)}</>; } },
  'u_C004': { calcHeal: (stats) => 150 + (1.2 * stats.matk), descFn: (stats) => { const b = Math.round(1.2*(stats?.matk||0)); const heal = 150+b; return <>{FMT('全體回復 150+')}{renderBonusWithTooltip(b, "text-purple-400", "1.2 魔攻")}{FMT(` 生命(總: ${heal})，全體【聖祝】2層`)}</>; } },
  'u_C005': { calcPartyBuff: (stats) => [{type: 'pDefUp', val: 0.15+(0.001*stats.pdef), duration: 3}, {type: 'mDefUp', val: 0.15+(0.001*stats.mdef), duration: 3}, {type: 'breaker', duration: 2}], descFn: (stats) => { const pb = Math.round(0.1*(stats?.pdef||0)); const mb = Math.round(0.1*(stats?.mdef||0)); return <>{FMT('提升全體物防 15+')}{renderBonusWithTooltip(pb, "text-yellow-400", "0.1% 物防")}{FMT(`% & 魔防 15+`)}{renderBonusWithTooltip(mb, "text-cyan-400", "0.1% 魔防")}{FMT(`% (3T)，全體【破陣】(2T)`)}</>; } },
  'u_C006': { calcBaseDmg: (stats) => 150 + (0.6 * stats.atk), descFn: (stats) => { const b = Math.round(0.6*(stats?.atk||0)); const d = 150+b; return <>{FMT('對敵單體造成 5 ')}<span className="text-red-500 font-bold">hits</span>{FMT(' 150+')}{renderBonusWithTooltip(b, "text-orange-400", "0.6 物攻")}{FMT(` 傷害(總: ${d*5})，敵全體3層【灼傷】，我方全體【烽火】(2T)`)}</>; } },
  'u_C007': { calcBaseDmg: (stats, attackerRef, draft) => { let totalSt=0; draft?.party?.forEach(p => { if (p?.baseStats?.hp>0) { let t = p.buffs?.find(b=>b.type==='tide'); if(t) totalSt+=t.stacks; }}); return ((200+0.5*stats.atk+1.2*stats.matk)*(1+totalSt*0.1))/3; }, postEffect: (attackerRef, draft) => { draft?.party?.forEach(p => { if (p) p.buffs = p.buffs?.filter(b=>b.type!=='tide'); }); }, descFn: (stats, attackerRef, state) => { let totalSt=0; state?.party?.forEach(p => { if (p?.baseStats?.hp>0) { let t = p.buffs?.find(b=>b.type==='tide'); if(t) totalSt+=t.stacks; }}); const b1=Math.floor(0.5*(stats?.atk||0)); const b2=Math.floor(1.2*(stats?.matk||0)); const multi=1+totalSt*0.1; const totalDmg=Math.floor((200+b1+b2)*multi); return <>{FMT('對敵單體造成 3 ')}<span className="text-red-500 font-bold">hits</span>{FMT(` (200+`)}{renderBonusWithTooltip(b1, "text-orange-400", "0.5 物攻")}{FMT('+')}{renderBonusWithTooltip(b2, "text-purple-400", "1.2 魔攻")}{FMT(`) x (每層潮汐提升10%，當前: x${multi.toFixed(1)}) 的總傷害(總計: ${totalDmg})，移除全體【潮汐】`)}</>; } },
  'u_C008': { postEffect: (attackerRef, draft, addPopupFn) => { let wg = attackerRef?.buffs?.find(b=>b.type==='windGuard'); let st = wg?wg.stacks:0; let cStats = getStats(attackerRef, true, {}, {}, {}); let sAmt = Math.floor(200+0.4*cStats.pdef+0.4*cStats.mdef+st*50); draft.party.forEach((p, idx) => { if (p.baseStats?.hp>0) { p.baseStats.permShield = (p.baseStats.permShield || 0) + sAmt; p.baseStats.shield = (p.baseStats.permShield || 0) + (p.baseStats.tempShields || []).reduce((sum, ts) => sum + ts.amt, 0); addPopupFn('party', idx, `護盾 +${sAmt}`, 'text-white font-bold scale-110 drop-shadow-md'); }}); }, descFn: (stats, attackerRef) => { let wg = attackerRef?.buffs?.find(b=>b.type==='windGuard'); let st = wg?wg.stacks:0; const b1=Math.floor(0.4*(stats?.pdef||0)); const b2=Math.floor(0.4*(stats?.mdef||0)); return <>{FMT('敵全體雙攻降20%、雙防降40%(2T)，全體 200+')}{renderBonusWithTooltip(b1, "text-yellow-400", "0.4 物防")}{FMT('+')}{renderBonusWithTooltip(b2, "text-cyan-400", "0.4 魔防")}{FMT('+')}{renderBonusWithTooltip(st*50, "text-green-300", "每層風護 50 點")}{FMT(` (總計: ${200+b1+b2+st*50}) 護盾`)}</>; } }
};

let _cachedChurchUpgrades = null;
function getChurchUpgrades() {
    if (_cachedChurchUpgrades && Object.keys(SKILL_DB).length > 0 && _cachedChurchUpgrades.length > 0) return _cachedChurchUpgrades;
    const upgrades = [];
    Object.entries(SKILL_DB).forEach(([id, sDef]) => {
        if (id.includes('ex')) {
            const charIdMatch = id.match(/s_(C\d+)/);
            if (charIdMatch) {
                upgrades.push({
                    id: id,
                    type: 'skill',
                    charId: charIdMatch[1],
                    name: sDef.name || id,
                    desc: sDef.desc || '',
                    cost: sDef.cost || 40
                });
            }
        }
    });
    if (Object.keys(SKILL_DB).length > 0) _cachedChurchUpgrades = upgrades;
    return upgrades;
}

// ==========================================
// 2. 輔助運算與生成 (Helpers)
// ==========================================

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function randRange(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function generateId() { return Math.random().toString(36).substr(2, 9); }

function getCharDisplayName(char, tiers = {}, upgrades = []) {
  const tier = tiers[char.id] || 0;
  const isUpgraded = upgrades.some(u => getChurchUpgrades().find(c => c.id === u)?.charId === char.id);
  const titleStr = typeof char.title === 'string' ? char.title : '';
  const nameStr = typeof char.name === 'string' ? char.name : '';
  const displayStr = tier >= 5 && titleStr ? `${titleStr}．${nameStr}` : nameStr;
  return displayStr + (isUpgraded ? ' ✿' : '');
}

function getActualSkills(char, upgrades = []) {
  return char.skills.map(sid => {
      if (upgrades.includes(`${sid}ex`)) return `${sid}ex`;
      return sid;
  });
}

function getStatDisplayData(stats, refineBonus = {}) {
    let parts = [];
    const formatVal = (v, isPct) => isPct ? `${Math.min(100, Math.floor(v*100))}%` : v;
    const addPart = (keyNew, keyOld, label, isPct) => {
        const val = stats[keyNew] !== undefined ? stats[keyNew] : stats[keyOld];
        const bVal = refineBonus[keyNew] !== undefined ? refineBonus[keyNew] : refineBonus[keyOld];
        if (val !== undefined) {
            parts.push({
                label, 
                baseStr: formatVal(val, isPct),
                bonusStr: (bVal || 0) > 0 ? formatVal(bVal, isPct) : null,
                sumStr: formatVal(val + (bVal || 0), isPct)
            });
        }
    };
    addPart('pAtk', 'atk', '物理攻擊', false); 
    addPart('mAtk', 'matk', '魔法攻擊', false); 
    addPart('hp', 'hp', '生命', false);
    addPart('pDef', 'pdef', '物理防禦', false); 
    addPart('mDef', 'mdef', '魔法防禦', false); 
    addPart('crit', 'crit', '暴擊率', true);
    addPart('da', 'da', 'DA率', true); 
    addPart('ta', 'ta', 'TA率', true);
    return parts;
}

function getInlineStatString(eq, sumMode = false) {
    return getStatDisplayData(eq.stats, eq.refineBonus).map(st => `${st.label}+${sumMode ? st.sumStr : `${st.baseStr}${st.bonusStr ? `(+${st.bonusStr})` : ''}`}`).join(' ');
}

function renderAttributeTags(thresholds) {
    const map = { hp: '最大生命', pAtk: '物理攻擊', mAtk: '魔法攻擊', pDef: '物理防禦', mDef: '魔法防禦', crit: '暴擊率', da: 'DA', ta: 'TA' };
    if(!thresholds || !thresholds.common) return null;
    return Object.keys(thresholds.common).map(k => map[k]).filter(Boolean).map((name, i) => (
        <span key={i} className="bg-gray-800 text-yellow-400 px-2 py-1 rounded text-xs font-bold border border-yellow-600/30 shadow-sm">[{name}]</span>
    ));
}

function generateEnemiesDynamic(nodeType, f, currentDungeon, dList, advLevel = 0, enemyDb = {}, materialDb = {}) {
    const safeDList = dList || [];
    const dungeon = safeDList.find(d => d.id === currentDungeon) || safeDList[0] || { mobs: [], elites: [], bosses: [] };
    
    // 依據難度 (0:一般, 1:異變, 2:崩壞, 3:終末) 與層數 (1, 2, 3) 進行體質倍率縮放
    const scalingMatrix = {
        0: { 1: 1.0, 2: 1.25, 3: 1.5 },   // 一般難度
        1: { 1: 2.0, 2: 2.25, 3: 2.75 },  // 異變
        2: { 1: 3.0, 2: 3.5, 3: 4.0 },    // 崩壞
        3: { 1: 5.0, 2: 6.0, 3: 7.0 }     // 終末
    };
    const levelData = scalingMatrix[advLevel] || scalingMatrix[0];
    const statMult = levelData[f] || levelData[3] || 1.0;
    
    const dummyStats = { hp: [100, 200], atk: [10, 20], matk: [10, 20], pdef: [5, 10], mdef: [5, 10] };
    
    const getEnemiesFromDb = (idsArr) => {
        if (!idsArr || !Array.isArray(idsArr) || idsArr.length === 0) return null;
        const found = idsArr.map(id => typeof id === 'string' ? enemyDb[id] : id).filter(Boolean);
        return found.length > 0 ? found : null;
    };

    const dMobs = getEnemiesFromDb(dungeon.encounters?.mobs) || (Array.isArray(dungeon.mobs) && dungeon.mobs.length > 0 ? dungeon.mobs : [{name: '未知怪物', baseStats: dummyStats}]);
    const dElites = getEnemiesFromDb(dungeon.encounters?.elite) || getEnemiesFromDb(dungeon.encounters?.elites) || (Array.isArray(dungeon.elites) && dungeon.elites.length > 0 ? dungeon.elites : dMobs);
    const dBosses = getEnemiesFromDb(dungeon.encounters?.boss) || getEnemiesFromDb(dungeon.encounters?.bosses) || (Array.isArray(dungeon.bosses) && dungeon.bosses.length > 0 ? dungeon.bosses : dElites);

    const createMob = (template, typeMult) => {
       let e = JSON.parse(JSON.stringify(template));
       const bStats = e.stats || e.baseStats || dummyStats;
       
       // 生命與雙攻雙防套用綜合倍率 (體質縮放矩陣 x 怪物階級倍率)
       const baseMult = statMult * typeMult;
       e.baseStats = {
           hp: Math.floor(randRange(bStats.hp[0]*baseMult, bStats.hp[1]*baseMult)),
           atk: Math.floor(randRange(bStats.atk[0]*baseMult, bStats.atk[1]*baseMult)),
           matk: Math.floor(randRange(bStats.matk[0]*baseMult, bStats.matk[1]*baseMult)),
           pdef: Math.floor(randRange(bStats.pdef[0]*baseMult, bStats.pdef[1]*baseMult)),
           mdef: Math.floor(randRange(bStats.mdef[0]*baseMult, bStats.mdef[1]*baseMult)),
           crit: bStats.crit ? randRange(bStats.crit[0]*100, bStats.crit[1]*100)/100 : 0.1,
           da: bStats.da ? randRange(bStats.da[0]*100, bStats.da[1]*100)/100 : 0.1,
           ta: bStats.ta ? randRange(bStats.ta[0]*100, bStats.ta[1]*100)/100 : 0.02,
           shield: 0, permShield: 0, tempShields: []
       };
       e.baseStats.maxHp = e.baseStats.hp;
       
       let drops = [];

       // 怪物個體專屬掉落物
       if(template.nDrop && Math.random() < 0.5) drops.push({name: template.nDrop, val: randRange(1,2)});
       if(template.rDrop && Math.random() < 0.15) drops.push({name: template.rDrop, val: 1});
       if(template.specificDrops && Array.isArray(template.specificDrops)) {
           template.specificDrops.forEach(dropItem => {
               if (typeof dropItem === 'string') {
                   if (Math.random() < 0.4) drops.push({ name: dropItem, val: randRange(1, 2) });
               } else if (typeof dropItem === 'object' && dropItem !== null) {
                   const dropRate = dropItem.rate !== undefined ? dropItem.rate : 1.0;
                   if (Math.random() <= dropRate) {
                       const matId = dropItem.id;
                       const matName = materialDb[matId]?.name || matId;
                       const dropAmt = Array.isArray(dropItem.amount) ? randRange(dropItem.amount[0], dropItem.amount[1]) : (dropItem.amount || 1);
                       drops.push({ name: matName, val: dropAmt });
                   }
               }
           });
       }
       if (nodeType === 'elite' && Math.random() < 0.3 && template.nDrop) drops.push({name: template.nDrop, val: 1});
       if (nodeType === 'boss' && Math.random() < 1.0 && template.nDrop) drops.push({name: template.nDrop, val: 1});
       
       return { ...e, id: generateId(), drops: drops, buffs: [], energy: 0, skillCooldowns: {} };
    };

    let enemies = [];
    if (nodeType === 'boss') {
        enemies.push({ ...createMob(dBosses[(f-1) % dBosses.length], 6.0), id: `boss_${generateId()}` });
    } else if (nodeType === 'elite') {
       // 菁英戰鬥隨機遭遇 1~4 名菁英敵人
       let count = randRange(1, 4);
       for(let i=0; i<count; i++) enemies.push({ ...createMob(dElites[randRange(0, dElites.length-1)], 2.5), id: `elite_${generateId()}` });
    } else {
       // 一般戰鬥隨機遭遇 2~5 名敵人
       let count = randRange(2, 5);
       for(let i=0; i<count; i++) enemies.push({ ...createMob(dMobs[randRange(0, dMobs.length-1)], 1.0), id: `mob_${generateId()}` });
    }
    
    // 新版全域掉落素材 (Dungeon Loot) - 一場戰鬥結算一次並附加於首個敵人身上
    if (enemies.length > 0 && dungeon.dungeonLoot && Array.isArray(dungeon.dungeonLoot)) {
        dungeon.dungeonLoot.forEach(lootItem => {
            if (typeof lootItem === 'string') {
                let chance = nodeType === 'boss' ? 1.0 : (nodeType === 'elite' ? 0.6 : 0.35);
                if (Math.random() < chance) {
                    let qty = nodeType === 'boss' ? randRange(2, 4) : (nodeType === 'elite' ? randRange(1, 2) : 1);
                    enemies[0].drops.push({ name: lootItem, val: qty });
                }
            } else if (typeof lootItem === 'object' && lootItem !== null) {
                const matId = lootItem.id;
                const matName = materialDb[matId]?.name || lootItem.name || matId;
                
                let dropConf = null;
                if (nodeType === 'boss') dropConf = lootItem.boss;
                else if (nodeType === 'elite') dropConf = lootItem.elite;
                else dropConf = lootItem.mobs;

                if (dropConf) {
                    const rate = dropConf.rate !== undefined ? dropConf.rate : 1.0;
                    if (Math.random() <= rate) {
                        let qty = 1;
                        if (Array.isArray(dropConf.amount)) qty = randRange(dropConf.amount[0], dropConf.amount[1] || dropConf.amount[0]);
                        else if (typeof dropConf.amount === 'number') qty = dropConf.amount;
                        enemies[0].drops.push({ name: matName, val: qty });
                    }
                } else {
                    let chance = nodeType === 'boss' ? 1.0 : (nodeType === 'elite' ? 0.6 : 0.35);
                    if (Math.random() < chance) {
                        let qty = nodeType === 'boss' ? randRange(2, 4) : (nodeType === 'elite' ? randRange(1, 2) : 1);
                        enemies[0].drops.push({ name: matName, val: qty });
                    }
                }
            }
        });
    }

    return enemies;
}

const evaluateModifierValue = (valExpr, bEntity, bDef, entityStats) => {
    if (typeof valExpr === 'number') return valExpr;
    if (typeof valExpr !== 'string') return 0;
    
    let valStr = valExpr;
    const bVal = bEntity.val !== undefined ? bEntity.val : (bDef?.val !== undefined ? bDef.val : 0.2);
    
    if (valStr === 'val') return bVal;
    if (valStr === '-val') return -bVal;
    
    try {
        let expr = valStr
            .replace(/\bstacks\b/g, bEntity.stacks !== undefined ? bEntity.stacks : 1)
            .replace(/\bduration\b/g, bEntity.duration !== undefined ? bEntity.duration : 0)
            .replace(/\bval\b/g, bVal)
            .replace(/\b(pAtk|patk)\b/gi, entityStats?.pAtk || 0)
            .replace(/\b(mAtk|matk)\b/gi, entityStats?.mAtk || 0)
            .replace(/\b(pDef|pdef)\b/gi, entityStats?.pDef || 0)
            .replace(/\b(mDef|mdef)\b/gi, entityStats?.mDef || 0);
        
        return new Function('return ' + expr)();
    } catch(e) {
        console.warn("Modifier expression evaluation failed:", valStr, e);
        return 0;
    }
};

function getStats(char, isPlayer = false, tiers = {}, charEquips = {}, runState = {}) {
  let mods = { 
    pAtkPct: 0, mAtkPct: 0, pDefPct: 0, mDefPct: 0, 
    flatPAtk: 0, flatMAtk: 0, flatPDef: 0, flatMDef: 0,
    crit: 0, critDmg: 0, da: 0, ta: 0, hpPct: 0, 
    dmgDealt: 0, dmgTaken: 0, healBonus: 0, receivedHeal: 0, dynamicMitigation: 0
  };
  let flat = { hp: 0, pAtk: 0, mAtk: 0, pDef: 0, mDef: 0, Math: 0, da: 0, ta: 0, crit: 0 };
  
  if (isPlayer) {
    const equips = charEquips[char.id] || {};
    Object.values(equips).forEach(eq => {
      if(eq && eq.stats) {
        flat.hp += (eq.stats.hp || eq.stats.maxHp || 0) + (eq.refineBonus?.hp || eq.refineBonus?.maxHp || 0); 
        flat.pAtk += (eq.stats.pAtk || eq.stats.atk || 0) + (eq.refineBonus?.pAtk || eq.refineBonus?.atk || 0); 
        flat.mAtk += (eq.stats.mAtk || eq.stats.matk || 0) + (eq.refineBonus?.mAtk || eq.refineBonus?.matk || 0);
        flat.pDef += (eq.stats.pDef || eq.stats.pdef || 0) + (eq.refineBonus?.pDef || eq.refineBonus?.pdef || 0); 
        flat.mDef += (eq.stats.mDef || eq.stats.mdef || 0) + (eq.refineBonus?.mDef || eq.refineBonus?.mdef || 0);
        flat.crit += (eq.stats.crit || 0) + (eq.refineBonus?.crit || 0); 
        flat.da += (eq.stats.da || 0) + (eq.refineBonus?.da || 0); 
        flat.ta += (eq.stats.ta || 0) + (eq.refineBonus?.ta || 0);
      }
    });
  }

  const tier = isPlayer ? (tiers[char.id] || 0) : 0;
  const tMult = 1 + (tier * 0.2);
  let epMult = (runState?.epBoosts?.[char.id]) || 1.0;
  let campMult = 1.0 + ((runState?.campBoostStacks) || 0) * 0.05;
  let runMult = isPlayer ? (epMult * campMult) : 1.0;
  const bStats = char.baseStats || {};

  let tempPAtk = Math.max(1, Math.floor(((bStats.pAtk || bStats.atk || 0) * tMult + flat.pAtk) * runMult));
  let tempMAtk = Math.max(1, Math.floor(((bStats.mAtk || bStats.matk || 0) * tMult + flat.mAtk) * runMult));
  let tempPDef = Math.max(1, Math.floor(((bStats.pDef || bStats.pdef || 0) * tMult + flat.pDef) * runMult));
  let tempMDef = Math.max(1, Math.floor(((bStats.mDef || bStats.mdef || 0) * tMult + flat.mDef) * runMult));

  if (char.buffs && Array.isArray(char.buffs)) {
    char.buffs.forEach(b => {
      const bDef = BUFF_DB[b.type];
      if (!bDef) return;

      if (bDef.modifiers) {
          const currentTempStats = { 
              atk: tempPAtk, patk: tempPAtk, pAtk: tempPAtk, 
              matk: tempMAtk, mAtk: tempMAtk, 
              pdef: tempPDef, pDef: tempPDef, 
              mdef: tempMDef, mDef: tempMDef 
          };
          if (Array.isArray(bDef.modifiers)) {
              bDef.modifiers.forEach(mod => {
                  let valExpr = mod.value !== undefined ? mod.value : (mod.val !== undefined ? mod.val : 0);
                  let amount = evaluateModifierValue(valExpr, b, bDef, currentTempStats);
                  if (typeof valExpr === 'number' && (bDef.mech === 'stack' || bDef.mech === 'stack_duration')) {
                      amount *= (b.stacks || 1);
                  }
                  
                  const map = { 
                      pAtk: 'pAtkPct', patk: 'pAtkPct', atk: 'pAtkPct',
                      mAtk: 'mAtkPct', matk: 'mAtkPct',
                      pDef: 'pDefPct', pdef: 'pDefPct',
                      mDef: 'mDefPct', mdef: 'mDefPct',
                      crit: 'crit', da: 'da', ta: 'ta' 
                  };
                  const targetKey = map[mod.stat] || mod.stat;
                  if (mods[targetKey] !== undefined) {
                      if (mod.type === 'add' || !mod.type) mods[targetKey] += amount;
                      else if (mod.type === 'sub') mods[targetKey] -= amount;
                  }
              });
          } else {
              Object.entries(bDef.modifiers).forEach(([mKey, mVal]) => {
                  let amount = evaluateModifierValue(mVal, b, bDef, currentTempStats);
                  if (typeof mVal === 'number' && (bDef.mech === 'stack' || bDef.mech === 'stack_duration')) {
                      amount *= (b.stacks || 1);
                  }
                  
                  const mapKey = {
                      pAtkPct: 'pAtkPct', patkPct: 'pAtkPct', atkPct: 'pAtkPct',
                      mAtkPct: 'mAtkPct', matkPct: 'mAtkPct',
                      pDefPct: 'pDefPct', pdefPct: 'pDefPct',
                      mDefPct: 'mDefPct', mdefPct: 'mDefPct'
                  }[mKey] || mKey;
                  
                  if (mods[mapKey] !== undefined) mods[mapKey] += amount;
              });
          }
      }

      if (bDef.effect) {
          bDef.effect(mods, b);
      }

      if (bDef.dynamicMitigation) {
          const { base, scalingFactor, scalingStat } = bDef.dynamicMitigation;
          let refStat = 0;
          if (scalingStat === 'pAtk' || scalingStat === 'atk' || scalingStat === 'patk') refStat = tempPAtk;
          else if (scalingStat === 'mAtk' || scalingStat === 'matk') refStat = tempMAtk;
          else if (scalingStat === 'pDef' || scalingStat === 'pdef') refStat = tempPDef;
          else if (scalingStat === 'mDef' || scalingStat === 'mdef') refStat = tempMDef;

          mods.dynamicMitigation += (base || 0) + ((scalingFactor || 0) * refStat);
      }
    });
  }

  let calculatedCrit = ((bStats.crit || 0.1) + mods.crit + flat.crit) * (isPlayer ? campMult : 1.0);
  let critOverflow = calculatedCrit > 1.0 ? calculatedCrit - 1.0 : 0;
  calculatedCrit = Math.min(calculatedCrit, 1.0);

  const pAtkFinal = Math.max(1, Math.floor((tempPAtk + mods.flatPAtk) * (1 + mods.pAtkPct)));
  const mAtkFinal = Math.max(1, Math.floor((tempMAtk + mods.flatMAtk) * (1 + mods.mAtkPct)));
  const pDefFinal = Math.max(1, Math.floor((tempPDef + mods.flatPDef) * (1 + mods.pDefPct)));
  const mDefFinal = Math.max(1, Math.floor((tempMDef + mods.flatMDef) * (1 + mods.mDefPct)));

  return {
    maxHp: Math.floor(((bStats.maxHp || bStats.hp || 0) * tMult + flat.hp) * (1 + mods.hpPct) * runMult),
    pAtk: pAtkFinal,
    atk: pAtkFinal, 
    mAtk: mAtkFinal,
    matk: mAtkFinal, 
    pDef: pDefFinal,
    pdef: pDefFinal, 
    mDef: mDefFinal,
    mdef: mDefFinal, 
    crit: calculatedCrit, 
    da: ((bStats.da || 0.1) + mods.da + flat.da) * (isPlayer ? campMult : 1.0), 
    ta: ((bStats.ta || 0.02) + mods.ta + flat.ta) * (isPlayer ? campMult : 1.0),
    critDmg: 1.5 + mods.critDmg + critOverflow,
    dmgDealt: mods.dmgDealt,
    dmgTaken: mods.dmgTaken + mods.dynamicMitigation,
    healBonus: mods.healBonus,
    receivedHeal: mods.receivedHeal
  };
}

function calcDamage(attacker, defender, type = 'phys', multiplier = 1.0, attackerIsPlayer = false, defenderIsPlayer = false, tiers = {}, charEquips = {}, runState = {}, baseDmgOverride = null) {
  const atkStats = getStats(attacker, attackerIsPlayer, tiers, charEquips, runState);
  const defStats = getStats(defender, defenderIsPlayer, tiers, charEquips, runState);
  
  let baseAtk = type === 'phys' ? atkStats.atk : atkStats.matk;
  let baseDef = type === 'phys' ? defStats.pdef : defStats.mdef;
  
  // 1. 基礎傷害 (Base Damage)
  let baseDmg = baseDmgOverride !== null ? baseDmgOverride : (baseAtk * multiplier);
  
  // 2. 防禦減免 (Defense Mitigation)
  let defMultiplier = 100 / (100 + baseDef);
  let step1 = baseDmg * defMultiplier;
  
  // 角色特有真傷計算 (不套用防禦減免的部份)
  let isQueenFullHp = attacker.role === 'queen' && attacker.baseStats.hp >= atkStats.maxHp;
  if (isQueenFullHp) step1 = (baseDmg * 0.3) + (baseDmg * 0.7 * defMultiplier);
  
  // 角色特有減傷
  if (attacker.role === 'bishop') step1 *= 0.15;

  // 3. 增傷倍率 (Damage Boosts)
  let dmgDealtMult = 1 + Math.max(-0.9, atkStats.dmgDealt || 0);
  let step2 = step1 * dmgDealtMult;

  // 4. 暴擊倍率 (Crit Multiplier)
  let isCrit = Math.random() < atkStats.crit;
  let critMult = 1.0;
  if (isCrit) {
      critMult = atkStats.critDmg + (attacker._knightCritBonus || 0);
      if (attacker.role === 'knight') attacker._knightCritBonus = Math.min(0.75, (attacker._knightCritBonus || 0) + 0.025);
  }
  let step3 = step2 * critMult;

  // 5. 屬性剋制 (Elemental Advantage)
  let eleMult = 1.0; let eleMsg = '';
  if (attacker.element && defender.element) {
      if (ELEM_ADV[attacker.element] === defender.element) { eleMult = 1.25; eleMsg = 'WEAK'; }
      else if (ELEM_ADV[defender.element] === attacker.element) { eleMult = 0.75; eleMsg = 'RESIST'; }
  }
  let step4 = step3 * eleMult;

  // 6. 最終減傷 (Final Mitigation)
  let dmgTakenMult = 1 - Math.min(0.9, defStats.dmgTaken || 0);
  let finalDmg = step4 * dmgTakenMult;
  
  // 隨機浮動值
  finalDmg = finalDmg * (0.95 + Math.random() * 0.1);
  
  return { dmg: Math.max(1, Math.floor(finalDmg)), isCrit, eleMsg, element: attacker.element };
}

function applyHeal(target, baseAmount, isPlayer, tiers, charEquips, runState, casterStats = null) {
  if(!target || target.baseStats.hp <= 0) return { msg: '目標已死亡', val: 0, isCrit: false };
  
  const targetStats = getStats(target, isPlayer, tiers, charEquips, runState);
  
  // 1. 基礎回復量
  let step1 = baseAmount;

  // 2. 施法者治療加成
  let healBonus = casterStats ? (casterStats.healBonus || 0) : 0;
  let step2 = step1 * (1 + healBonus);

  // 3. 目標受治療加成
  let receivedHeal = targetStats.receivedHeal || 0;
  let step3 = step2 * (1 + receivedHeal);

  // 4. 治療暴擊
  let critChance = casterStats ? (casterStats.crit || 0) : 0;
  let isCrit = Math.random() < critChance;
  let critMult = isCrit ? 1.25 : 1.0;
  let finalHeal = Math.floor(step3 * critMult);

  // 實際生命值維持上限限制
  target.baseStats.hp = Math.min(targetStats.maxHp, target.baseStats.hp + finalHeal);
  
  // 即使角色生命值全滿，顯示的回復數值也將完整傳遞 (顯示 finalHeal 而非受限後的差值)
  return { msg: `${getCharDisplayName(target, tiers)} 回復了 ${finalHeal} 點生命。`, val: finalHeal, isCrit };
}

function createInstancedItem(baseId, rarityStr, itemDb = {}) {
  const base = itemDb[baseId];
  if (!base) return null;
  
  const rIdx = RARITY_ORDER.indexOf(rarityStr);
  const tierData = base.tiers?.[rarityStr] || (base.tiers ? Object.values(base.tiers)[0] : {});
  
  const itemDesc = tierData.desc || base.desc || `造成 ${base.effectType} 效果`;
  const itemName = base.baseName || base.name || '未知道具';
  const imageUrl = base.imageUrl || tierData.imageUrl;

  let price = 50;
  if (tierData.priceRange && Array.isArray(tierData.priceRange) && tierData.priceRange.length === 2) {
      price = randRange(tierData.priceRange[0], tierData.priceRange[1]);
  } else if (tierData.price || base.price) {
      price = Math.floor((tierData.price || base.price) * (0.9 + Math.random() * 0.2));
  } else {
      price = Math.floor(50 * (1 + rIdx) * (0.9 + Math.random() * 0.2));
  }

  const effectFn = (state, tIdx, tiers, eqSt, runState) => {
      let popups = []; let logMsg = `使用了 ${itemName}！`;
      let val = tierData.val !== undefined ? tierData.val : (base.val || 0);
      let duration = tierData.duration || base.duration || 3;

      const applyToTarget = (target, idx, side) => {
          if (!target || target.baseStats.hp <= 0) return;
          if (base.effectType === 'heal') {
              let stats = getStats(target, side === 'party', tiers, eqSt, runState);
              let healAmt = val <= 1 ? Math.floor(stats.maxHp * val) : val; 
              let res = applyHeal(target, healAmt, side === 'party', tiers, eqSt, runState, null);
              popups.push({side, idx, text:`+${res.val}`, color:'text-green-400 font-bold scale-110'});
          } else if (base.effectType === 'buff' || base.effectType === 'debuff') {
              const bType = tierData.buffType || base.buffType || (base.effectType === 'debuff' ? 'itemDebuff' : 'itemBuff');
              if (bType && BUFF_DB[bType]) {
                  addBuffToEntity(target, { type: bType, val: val, duration: duration });
                  popups.push({side, idx, text: bType, isBuff:true, isDebuff: base.effectType === 'debuff'});
              } else {
                  if (base.effectType === 'debuff') {
                      let dmg = val <= 10 ? 500 : val;
                      target.baseStats.hp -= dmg;
                      popups.push({side, idx, text:dmg.toString(), color:'text-white'});
                  } else {
                      addBuffToEntity(target, { type: 'itemBuff', val: val, duration: duration });
                      popups.push({side, idx, text:'itemBuff', isBuff:true, isDebuff: false});
                  }
              }
          }
      };

      if (base.targetType === 'player_single') { applyToTarget(state.party[tIdx], tIdx, 'party'); }
      else if (base.targetType === 'player_all') { state.party.forEach((p, i) => applyToTarget(p, i, 'party')); }
      else if (base.targetType === 'enemy_single') { applyToTarget(state.enemies[tIdx], tIdx, 'enemy'); }
      else if (base.targetType === 'enemy_all') { state.enemies.forEach((e, i) => applyToTarget(e, i, 'enemy')); }

      return { logMsg, popups };
  };

  return { id: baseId, instanceId: generateId(), name: itemName, rarity: rarityStr, desc: itemDesc, price: price, targetType: base.targetType, effectType: base.effectType, imageUrl: imageUrl, effect: effectFn };
}

function generateMapGraph() {
  let layers = []; const layerHeight = 120; const totalHeight = 9 * layerHeight;
  layers.push({ level: 1, nodes: [
    { id: '1-0', type: 'battle', parents: [], x: 20, y: totalHeight - layerHeight },
    { id: '1-1', type: 'battle', parents: [], x: 50, y: totalHeight - layerHeight },
    { id: '1-2', type: 'battle', parents: [], x: 80, y: totalHeight - layerHeight }
  ]});

  for(let i=2; i<=8; i++) {
     let nodes = []; let prevLayerNodes = layers[i-2].nodes; let numNodes = randRange(3, 5); let y = totalHeight - i * layerHeight;
     for(let j=0; j<numNodes; j++) {
         let centerParentIdx = Math.floor(j * (prevLayerNodes.length / numNodes));
         let parents = [prevLayerNodes[centerParentIdx].id];
         if (centerParentIdx > 0 && Math.random() < 0.4) parents.push(prevLayerNodes[centerParentIdx - 1].id);
         if (centerParentIdx < prevLayerNodes.length - 1 && Math.random() < 0.4) parents.push(prevLayerNodes[centerParentIdx + 1].id);

         let type = 'battle'; let r = Math.random();
         if (i === 4 || i === 7) type = r < 0.6 ? 'elite' : 'battle';
         else if (i === 3 || i === 6) type = r < 0.3 ? 'event' : (r < 0.65 ? 'shop' : 'camp');
         else type = r < 0.25 ? 'event' : 'battle';
         if (i === 8) type = r < 0.5 ? 'camp' : 'shop';

         nodes.push({ id: `${i}-${j}`, type, parents: [...new Set(parents)], x: ((j + 1) / (numNodes + 1)) * 100, y });
     }
     prevLayerNodes.forEach((pNode, pIdx) => {
         let targetChildIdx = Math.floor((pIdx / prevLayerNodes.length) * numNodes);
         if (targetChildIdx >= numNodes) targetChildIdx = numNodes - 1;
         nodes[targetChildIdx].parents.push(pNode.id);
         if (Math.random() < 0.4 && targetChildIdx < numNodes - 1) nodes[targetChildIdx + 1].parents.push(pNode.id);
     });
     nodes.forEach((cNode, cIdx) => {
         if (cNode.parents.length === 0) {
             let targetParentIdx = Math.floor((cIdx / numNodes) * prevLayerNodes.length);
             if (targetParentIdx >= prevLayerNodes.length) targetParentIdx = prevLayerNodes.length - 1;
             cNode.parents.push(prevLayerNodes[targetParentIdx].id);
         }
         cNode.parents = [...new Set(cNode.parents)];
     });
     layers.push({ level: i, nodes });
  }
  layers.push({ level: 9, nodes: [{ id: '9-0', type: 'boss', parents: layers[7].nodes.map(n=>n.id), x: 50, y: totalHeight - 9 * layerHeight + 20 }] });
  return layers;
}

function generateEquip(level, equipRecipes, forcedRarity = null, forcedName = null, forcedType = null) {
  let rarity = forcedRarity;
  if(!rarity) {
    const rRARITY_WEIGHTS = {  common: 50,  uncommon: 30,  rare: 12,  legendary: 6,  epic: 1.5,  mythic: 0.5};  
    const roll = Math.random() * 100;
    if (roll < rRARITY_WEIGHTS.mythic) rarity = 'mythic';
    else if (roll < rRARITY_WEIGHTS.mythic + rRARITY_WEIGHTS.epic) rarity = 'epic';
    else if (roll < rRARITY_WEIGHTS.mythic + rRARITY_WEIGHTS.epic + rRARITY_WEIGHTS.legendary) rarity = 'legendary';
    else if (roll < rRARITY_WEIGHTS.mythic + rRARITY_WEIGHTS.epic + rRARITY_WEIGHTS.legendary + rRARITY_WEIGHTS.rare) rarity = 'rare';
    else if (roll < rRARITY_WEIGHTS.mythic + rRARITY_WEIGHTS.epic + rRARITY_WEIGHTS.legendary + rRARITY_WEIGHTS.rare + rRARITY_WEIGHTS.uncommon) rarity = 'uncommon';
    else rarity = 'common';
  }
  const rIdx = RARITY_ORDER.indexOf(rarity);
  const type = forcedType || EQ_TYPES[Math.floor(Math.random() * EQ_TYPES.length)];
  
  const safeRecipes = equipRecipes || [];
  const validRecipes = safeRecipes.filter(r => r.type === type);
  
  // 修正：優先使用 forcedName 找到正確的配方，確保圖示與名稱一致
  let baseRecipe;
  if (forcedName) {
      baseRecipe = validRecipes.find(r => r.name === forcedName);
  }
  if (!baseRecipe) {
      baseRecipe = validRecipes.length > 0 ? validRecipes[Math.floor(Math.random() * validRecipes.length)] : (safeRecipes.find(r => r.type === type) || safeRecipes[0] || { name: '未知裝備', type: type, thresholds: { common: { atk: [1, 2] } } });
  }
  
  const finalName = forcedName || baseRecipe.name;
  let stats = {};
  const thresholds = baseRecipe.thresholds ? (baseRecipe.thresholds[rarity] || baseRecipe.thresholds['common']) : { atk: [1, 2] };
  
  for (let k in thresholds) {
      const [min, max] = thresholds[k];
      if (k === 'crit' || k === 'da' || k === 'ta') stats[k] = parseFloat((min + Math.random() * (max - min)).toFixed(3));
      else stats[k] = randRange(min, max);
  }
  
  let priceFluc = 0.9 + Math.random() * 0.2;
  return { id: generateId(), name: finalName, rarity, type, stats, refineBonus: {}, price: Math.floor(50 * (1 + rIdx) * priceFluc), refineLevel: 0, imageUrl: baseRecipe.imageUrl };
}

function getMatSource(matName, dungeonList, enemyDb, materialDb) {
  if (!matName) return '未知領域';
  const found = [];
  if (Array.isArray(dungeonList)) {
    dungeonList.forEach(d => {
      if (d.dungeonLoot && Array.isArray(d.dungeonLoot)) {
        const hasLoot = d.dungeonLoot.some(l => {
          if (typeof l === 'string') return l === matName;
          if (typeof l === 'object' && l !== null) return l.name === matName || l.id === matName;
          return false;
        });
        if (hasLoot) found.push(d.name || d.id);
      }
    });
  }
  if (found.length > 0) return found.join(', ');
  return '全域素材';
}

const renderEquipTooltip = (eq, sumMode = false) => (
    <div className="font-sans w-64 p-4 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl relative z-[999999]">
       <div className={`font-bold ${RARITY_MAP[eq.rarity].color} mb-1 flex justify-between items-center border-b border-gray-700 pb-2`}>
           <span className="truncate text-base pr-2">{eq.refineLevel > 0 ? `${TXT(eq.name)} +${eq.refineLevel}` : TXT(eq.name)}</span>
           <span className="text-[10px] text-gray-500 flex-shrink-0 bg-gray-950 px-1.5 py-0.5 rounded">{RARITY_MAP[eq.rarity].name}</span>
       </div>
       {eq.imageUrl && <div className="w-full flex justify-center py-2"><img src={eq.imageUrl} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-16 h-16 object-contain" alt=""/></div>}
       <div className="text-xs text-gray-300 font-mono mt-3 space-y-1.5 break-words whitespace-normal">
           {getStatDisplayData(eq.stats, eq.refineBonus).map((st, idx) => (
               <div key={`s-${idx}`} className="flex justify-between gap-2">
                   <span className="shrink-0">{st.label}</span><span className="text-green-400 text-right break-words">+{sumMode ? st.sumStr : `${st.baseStr}${st.bonusStr ? ` (+${st.bonusStr})` : ''}`}</span>
               </div>
           ))}
       </div>
    </div>
);

const renderEquipBox = (eq) => (
    <div className={`border-2 rounded-lg p-3 bg-gray-900 flex flex-col items-center shadow-lg ${RARITY_MAP[eq.rarity].border} w-24 shrink-0`}>
        {eq.imageUrl ? <img src={eq.imageUrl} className="w-12 h-12 object-contain mb-2" alt=""/> : <div className="text-3xl mb-2">✨</div>}
        <span className={`text-xs font-bold truncate w-full text-center ${RARITY_MAP[eq.rarity].color}`}>{TXT(eq.name)}</span>
    </div>
);

const renderMatBox = (mat) => {
    const rInfo = RARITY_MAP[mat.rarity] || RARITY_MAP['common'];
    return (
        <div className={`relative border-2 rounded-lg p-2 bg-gray-900 flex flex-col items-center justify-center shadow-lg ${rInfo.border} w-20 shrink-0`}>
            {mat.imageUrl ? <img src={mat.imageUrl} className="w-10 h-10 object-contain mb-1" alt=""/> : <div className="text-2xl mb-1">📦</div>}
            <span className={`text-[10px] font-bold truncate w-full text-center ${rInfo.color}`}>{TXT(mat.name)}</span>
            <div className="absolute -top-2 -right-2 bg-gray-800 border border-gray-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-md z-10">
                x{mat.qty}
            </div>
        </div>
    );
};

const renderSkillTooltip = (sDef, isUp, sid, cStats) => {
    if (!sDef) return null;
    return (
        <div className="font-sans w-56 p-4 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl">
            <div className={`font-bold ${isUp ? 'text-orange-400' : 'text-blue-400'} mb-1 flex justify-between items-center border-b border-gray-700 pb-2`}>
                <span className="truncate text-base pr-2">{TXT(sDef.name)}</span>
                {isUp && <span className="text-[10px] text-white bg-orange-500 px-1.5 py-0.5 rounded font-bold">EX</span>}
            </div>
            <div className="text-xs text-gray-400 font-mono mb-2">CD: {sDef.cd} Turns</div>
            <div className="text-xs text-gray-300 leading-relaxed mb-2">{renderDynamicDesc(sDef.desc, cStats)}</div>
            {sDef.relatedBuffs && sDef.relatedBuffs.length > 0 && (
                 <div className="mt-2 space-y-1">
                     {sDef.relatedBuffs.map(bKey => {
                         const bDef = BUFF_DB[bKey];
                         if (!bDef || SIMPLE_BUFFS.includes(bKey)) return null;
                         return (
                             <div key={bKey} className="flex items-start gap-1 text-[10px] bg-gray-800 p-1.5 rounded border border-gray-700">
                                <img src={getBuffIconUrl(bKey)} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-5 h-5 object-contain" alt="" onError={(e)=>{e.target.style.display='none'}} />
                                <div className="flex-1">
                                    <div className={`font-bold ${bDef.color || 'text-white'}`}>{TXT(bDef.name)}</div>
                                    <div className="text-gray-400 leading-tight mt-0.5">
                                        {bDef.desc ? renderDynamicDesc(bDef.desc, { ...cStats, stacks: 1, duration: 3 }) : (bDef.descFn ? bDef.descFn(cStats) : FMT(bDef.name))}
                                    </div>
                                </div>
                             </div>
                         );
                     })}
                 </div>
            )}
        </div>
    );
};


// ==========================================
// 3. 主應用程式 (Main Component)
// ==========================================

export default function App() {
  const [screen, setScreen] = useState('title'); 
  const [prevScreen, setPrevScreen] = useState('town'); 
  const [isLoading, setIsLoading] = useState(true);
  const [devMode, setDevMode] = useState(false);
  const [bossEpLog, setBossEpLog] = useState([]); // 新增：用於記錄 Boss 戰結束時的 EP 宿命解放突破數據
  const [bossTierUpgradeLog, setBossTierUpgradeLog] = useState([]); // 新增：用於記錄 Boss 戰結束時的自動升階數據
  
  const [globalStorage, setGlobalStorage] = useState({ 
      townGold: 500, materials: {}, equips: [], upgradeStones: 0, evolutionStones: 0, wishFlowers: 0, 
      charTiers: {}, churchUpgrades: [], escapePenalty: false, unlockedDungeonLevels: {},
      refineStones: { common: 0, rare: 0, uncommon: 0, legendary: 0, epic: 0, mythic: 0 },
      charEquips: {},
      charSkins: {}
  });
  
  const [charPool, setCharPool] = useState([]);
  const [dungeonList, setDungeonList] = useState([]);
  const [equipRecipes, setEquipRecipes] = useState([]);
  const [itemDb, setItemDb] = useState({});
  const [materialDb, setMaterialDb] = useState({});
  const [enemyDb, setEnemyDb] = useState({});
  const [skinDb, setSkinDb] = useState([]);
  const [runDungeonLevel, setRunDungeonLevel] = useState(0);
  const [dungeonStartModal, setDungeonStartModal] = useState(null);
  const [selectedAdvLevel, setSelectedAdvLevel] = useState(0);

  const [matsGainedThisRun, setMatsGainedThisRun] = useState({});
  const [runState, setRunState] = useState({ campBoostStacks: 0, epBoosts: {}, merchantEncountered: false, godEncountered: false, evoStoneBought: false, floorMerchantEncountered: false });
  
  const [loadingState, setLoadingState] = useState({ phase: 'fetching', loaded: 0, total: 0 });
  const [mobSkillDb, setMobSkillDb] = useState({});
  const [partySlots, setPartySlots] = useState([null, null, null, null]);
  const [runDungeon, setRunDungeon] = useState('forest');
  const [floor, setFloor] = useState(1);
  const [mapGraph, setMapGraph] = useState(null);
  const [activeNodes, setActiveNodes] = useState([]); 
  const [currentNodeInfo, setCurrentNodeInfo] = useState(null);
  const [gold, setGold] = useState(0);
  const [runItems, setRunItems] = useState([]); 
  
  const [selCharIdx, setSelCharIdx] = useState(0);
  const [shopTab, setShopTab] = useState('buy_item');
  const [marketTab, setMarketTab] = useState('sigil');
  const [marketBuyModal, setMarketBuyModal] = useState(null);
  const [shopEquips, setShopEquips] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [shopRefreshes, setShopRefreshes] = useState({ weapon: false, head: false, body: false, shoes: false, accessory: false });
  const [synthTab, setSynthesisTab] = useState('craft');
  const [guildTab, setGuildTab] = useState('potential');
  const [targetRarity, setTargetRarity] = useState('random'); // 新增：用於鐵匠鋪指定階級
  const [invTab, setInvTab] = useState('equips'); 
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [eventData, setEventData] = useState(null);
  const [churchFilters, setChurchFilters] = useState({ skill: true, unlocked: false });
  const [charFilterElem, setCharFilterElem] = useState('all');
  const [charFilterRole, setCharFilterRole] = useState('all');
  
  const [selectedEq, setSelectedEq] = useState(null);
  const [dismantleSelections, setDismantleSelections] = useState([]);
  const [eqFilter, setEqFilter] = useState('all');
  const [hoverEqType, setHoveredEqType] = useState(null);
  const [craftedEquipModal, setCraftedEquipModal] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [charDetailView, setCharDetailView] = useState(null);
  const [detailItemModal, setDetailItemModal] = useState(null); 
  const [globalTooltip, setGlobalTooltip] = useState(null);
  const [battleState, setBattleState] = useState(null);
  const [battlePhase, setBattlePhase] = useState('idle'); 
  const [skillCooldowns, setSkillCooldowns] = useState({});
  const [ultToggled, setUltToggled] = useState([false, false, false, false]);
  const [pendingTarget, setPendingTarget] = useState(null); 
  const [itemPanelOpen, setItemPanelOpen] = useState(false);
  const [postBattleLoot, setPostBattleLoot] = useState([]);
  const [flashUnit, setFlashUnit] = useState(null); 
  const [popups, setPopups] = useState([]); 
  const [hitFlashes, setHitFlashes] = useState([]); // 新增受擊紅閃狀態
  const [focusedEnemy, setFocusedEnemy] = useState(null); 
  const [battleUnitDetail, setBattleUnitDetail] = useState(null);
  const [fullImageView, setFullImageView] = useState(null);
  const [currentSkinIndex, setCurrentSkinIndex] = useState(0);
  const [skinSlideDirection, setSkinSlideDirection] = useState('right');
  
  const mapScrollRef = useRef(null);

  const resetRunState = () => setRunState({ campBoostStacks: 0, epBoosts: {}, merchantEncountered: false, godEncountered: false, evoStoneBought: false, floorMerchantEncountered: false });

  const generateUniqueEquip = (level, recipes, rarity, type, existingNames) => {
      let eq = null;
      let retries = 0;
      do {
          eq = generateEquip(level, recipes, rarity, null, type);
          retries++;
      } while (existingNames.has(eq.name) && retries < 25);
      existingNames.add(eq.name);
      return eq;
  };

  const applyDevModeCheats = () => {
    const maxTiers = {};
    charPool.forEach(c => {
      maxTiers[c.id] = 5;
    });
    const maxDungeons = {};
    dungeonList.forEach(d => {
      maxDungeons[d.id] = 3;
    });
    
    // 建立所有可用素材清單，並一鍵設為 999 個
    const cheatMats = {};
    Object.keys(materialDb).forEach(mKey => {
        cheatMats[mKey] = 999;
    });
    const standardMats = ['陽炎刻印', '滄海刻印', '碧翠刻印', '荒野刻印', '天光刻印', '深影刻印', '木材'];
    standardMats.forEach(m => {
        cheatMats[m] = 999;
    });

    // 產生所有裝備各1件並直接自動強化到 +12
    const cheatEquips = [];
    if (Array.isArray(equipRecipes)) {
        equipRecipes.forEach(recipe => {
            let eq = generateEquip(3, equipRecipes, 'mythic', recipe.name, recipe.type);
            if (eq) {
                let currentBonus = {};
                Object.keys(eq.stats).forEach(k => { currentBonus[k] = 0; });
                // 模擬 12 次強化的屬性加成累加
                for (let rLvl = 0; rLvl < 12; rLvl++) {
                    Object.keys(eq.stats).forEach(k => {
                        let boostPct = 0; let probBoost = 0;
                        if (rLvl >= 0 && rLvl <= 3) { boostPct = randRange(2, 4) / 100; probBoost = randRange(1, 2) / 100; } 
                        else if (rLvl >= 4 && rLvl <= 8) { boostPct = randRange(4, 6) / 100; probBoost = randRange(2, 3) / 100; } 
                        else if (rLvl >= 9 && rLvl <= 11) { boostPct = randRange(7, 10) / 100; probBoost = randRange(3, 5) / 100; }

                        if (k === 'crit' || k === 'da' || k === 'ta') {
                            currentBonus[k] = parseFloat(((currentBonus[k] || 0) + probBoost).toFixed(4));
                        } else {
                            currentBonus[k] = (currentBonus[k] || 0) + Math.max(1, Math.floor((eq.stats[k] + (currentBonus[k] || 0)) * boostPct));
                        }
                    });
                }
                eq.refineBonus = currentBonus;
                eq.refineLevel = 12;
                cheatEquips.push(eq);
            }
        });
    }

    setGlobalStorage(prev => ({
      ...prev,
      charTiers: maxTiers,
      unlockedDungeonLevels: maxDungeons,
      upgradeStones: 999,
      evolutionStones: 999,
      wishFlowers: 999,
      refineStones: {
        common: 999,
        uncommon: 999,
        rare: 999,
        legendary: 999,
        epic: 999,
        mythic: 999
      },
      materials: cheatMats,
      equips: [...prev.equips, ...cheatEquips],
      townGold: 999999
    }));
  };

  const STATIC_MAT_URLS = {
      '升階石': getImgUrl('https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MATDB/mat070.png'),
      '平凡強化石': getImgUrl('https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MATDB/mat064.png'),
      '罕見強化石': getImgUrl('https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MATDB/mat065.png'),
      '稀有強化石': getImgUrl('https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MATDB/mat066.png'),
      '傳奇強化石': getImgUrl('https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MATDB/mat067.png'),
      '史詩強化石': getImgUrl('https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MATDB/mat068.png'),
      '神話強化石': getImgUrl('https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MATDB/mat069.png'),
      '陽炎刻印': getImgUrl('https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MATDB/mat057.png'),
      '滄海刻印': getImgUrl('https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MATDB/mat058.png'),
      '碧翠刻印': getImgUrl('https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MATDB/mat059.png'),
      '荒野刻印': getImgUrl('https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MATDB/mat060.png'),
      '天光刻印': getImgUrl('https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MATDB/mat061.png'),
      '深影刻印': getImgUrl('https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MATDB/mat062.png')
  };

  const getMatData = (matName) => {
      const fetched = materialDb[matName] || Object.values(materialDb).find(m => m.name === matName || m.id === matName);
      const staticUrl = STATIC_MAT_URLS[matName];
      if (fetched || staticUrl) return { rarity: fetched?.rarity || 'common', imageUrl: fetched?.imageUrl || staticUrl };
      return { rarity: 'common', imageUrl: null };
  };

  const getMatImg = (name) => {
      if (STATIC_MAT_URLS[name]) return STATIC_MAT_URLS[name];
      const map = { '升階石': 'mat070', '平凡強化石': 'mat064', '稀有強化石': 'mat065', '罕見強化石': 'mat066', '傳奇強化石': 'mat067', '史詩強化石': 'mat068', '神話強化石': 'mat069', '陽炎刻印': 'mat057', '滄海刻印': 'mat058', '碧翠刻印': 'mat059', '荒野刻印': 'mat060', '天光刻印': 'mat061', '深影刻印': 'mat062' };
      return materialDb[map[name] || name]?.imageUrl || null;
  }

  const getMatColorLocal = (matName) => RARITY_MAP[getMatData(matName).rarity]?.color || RARITY_MAP['common'].color;
  const getMatSourceLocal = (matName) => materialDb[matName]?.source || getMatSource(matName, dungeonList, enemyDb, materialDb);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const fetchJson = async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error("Invalid JSON from", url, text.substring(0, 50));
                throw e;
            }
        };

        setLoadingState({ phase: 'fetching', loaded: 0, total: 0 });
        const [dungeonsRes, charsRes, equipsRes, itemsRes, matDbRes, buffRes, skillRes, mobsRes, elitesRes, mobSkillRes, ultdbRes, bossesRes, skinDbRes] = await Promise.all([
          fetchJson('https://raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/dungeonlist.json'),
          fetchJson('https://raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/characterpool.json'),
          fetchJson('https://raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/equipment.json'),
          fetchJson('https://raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/item.json'),
          fetchJson('https://raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/matdb.json').catch(() => ({})),
          fetchJson('https://raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/buffdb.json').catch(() => ({})),
          fetchJson('https://raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/skilldb.json').catch(() => ({})),
          fetchJson('https://raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/mobs.json').catch(() => ({})),
          fetchJson('https://raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/elite.json').catch(() => ({})),
          fetchJson('https://raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/mobskilldb.json').catch(() => ({})),
          fetchJson('https://raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/ultdb.json').catch(() => ({})),
          fetchJson('https://raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/boss.json').catch(() => ({})),
          fetchJson('https://raw.githubusercontent.com/seraphimjoker/my-game-assets-test-images/main/skindb.json').catch(() => ([]))
        ]);

        const EN_TO_CH_ELEM = { 'water': '水', 'fire': '火', 'wind': '風', 'earth': '土', 'light': '光', 'dark': '暗' };

        const processUrls = (obj) => {
            if (obj && typeof obj === 'object') {
                if (obj.imageUrl) obj.imageUrl = getImgUrl(obj.imageUrl);
                if (obj.previewUrl) obj.previewUrl = getImgUrl(obj.previewUrl);
                if (obj.mapBgUrl) obj.mapBgUrl = getImgUrl(obj.mapBgUrl);
                if (obj.battleBgUrl) obj.battleBgUrl = getImgUrl(obj.battleBgUrl);
                // 自動將資料庫的英文屬性轉化為程式內核使用的中文屬性
                if (obj.element && typeof obj.element === 'string' && EN_TO_CH_ELEM[obj.element.toLowerCase()]) {
                    obj.element = EN_TO_CH_ELEM[obj.element.toLowerCase()];
                }
                // 預先處理未來可能加入的 skins 造型陣列圖片網址
                if (obj.skins && Array.isArray(obj.skins)) {
                    obj.skins.forEach(skin => {
                        if (skin.url) skin.url = getImgUrl(skin.url);
                    });
                }
            }
        };

        // 修正：確實將抓取到的地下城、角色池、裝備配方與道具資料寫入 React State 中
        if (Array.isArray(charsRes)) {
            charsRes.forEach(processUrls);
            setCharPool(charsRes);
        }
        if (Array.isArray(dungeonsRes)) {
            dungeonsRes.forEach(processUrls);
            setDungeonList(dungeonsRes);
        }
        if (Array.isArray(equipsRes)) {
            equipsRes.forEach(processUrls);
            setEquipRecipes(equipsRes);
        }
        let parsedItemDb = {};
        if (Array.isArray(itemsRes)) {
            itemsRes.forEach(item => {
                processUrls(item);
                if (item.id) parsedItemDb[item.id] = item;
            });
        } else if (itemsRes && typeof itemsRes === 'object') {
            parsedItemDb = { ...itemsRes };
            Object.values(parsedItemDb).forEach(item => {
                processUrls(item);
            });
        }
        setItemDb(parsedItemDb);

        let parsedMobSkillDb = {};
        if (Array.isArray(mobSkillRes)) {
            mobSkillRes.forEach(s => { if (s.id) parsedMobSkillDb[s.id] = s; });
        } else if (mobSkillRes && typeof mobSkillRes === 'object') {
            parsedMobSkillDb = { ...mobSkillRes };
            Object.values(mobSkillRes).forEach(s => { if (s && typeof s === 'object' && s.id) parsedMobSkillDb[s.id] = s; });
        }
        setMobSkillDb(parsedMobSkillDb);

        if (buffRes && typeof buffRes === 'object') {
            Object.keys(buffRes).forEach(key => { BUFF_DB[key] = { ...buffRes[key], ...(BUFF_LOGIC[key] || { effect: ()=>{} }) }; });
            Object.keys(BUFF_LOGIC).forEach(key => { if(!BUFF_DB[key]) BUFF_DB[key] = { name: key, desc: '未知狀態', color: 'text-gray-300', ...BUFF_LOGIC[key] }; });
        }

        if (skillRes && typeof skillRes === 'object') {
            Object.keys(skillRes).forEach(key => { 
                let sDef = skillRes[key];
                let rb = new Set(sDef.relatedBuffs || []);
                if(sDef.applyBuffs) sDef.applyBuffs.forEach(b => rb.add(b.type));
                if(sDef.applyDebuffs) sDef.applyDebuffs.forEach(b => rb.add(b.type));
                
                SKILL_DB[key] = { 
                    ...sDef, 
                    relatedBuffs: Array.from(rb).length > 0 ? Array.from(rb) : undefined,
                    effect: (state, cIdx, tIdx, tiers, eqSt, runState, applyDmgFn) => {
                        // 這裡自我綁定 SKILL_DB[key]，繞過任何參數傳遞落差
                        return executeDynamicSkill(state, cIdx, tIdx, tiers, eqSt, runState, applyDmgFn, SKILL_DB[key]);
                    }
                }; 
            });
        }

        if (ultdbRes && typeof ultdbRes === 'object') {
            Object.keys(ultdbRes).forEach(key => {
                ULT_DB[key] = {
                    ...ultdbRes[key],
                    ...(ULT_LOGIC[key] || {})
                };
            });
            Object.keys(ULT_LOGIC).forEach(key => {
                if (!ULT_DB[key]) {
                    ULT_DB[key] = { ...ULT_LOGIC[key] };
                }
            });
        } else {
            // 備用方案：在載入失敗時回退到本地硬編碼核心
            ULT_DB = { ...ULT_LOGIC };
        }

        let parsedMatDb = {};
        if (Array.isArray(matDbRes)) {
            matDbRes.forEach(m => { 
                processUrls(m);
                if (m.id) parsedMatDb[m.id] = m;
                if (m.name) parsedMatDb[m.name] = m; 
            });
        } else if (matDbRes && typeof matDbRes === 'object') {
            parsedMatDb = { ...matDbRes };
            Object.values(matDbRes).forEach(m => {
                if (m && typeof m === 'object') {
                    processUrls(m);
                    if (m.id) parsedMatDb[m.id] = m;
                    if (m.name) parsedMatDb[m.name] = m;
                }
            });
        }
        setMaterialDb(parsedMatDb);

        let combinedEnemies = {};
        const processEnemies = (data) => {
            if (Array.isArray(data)) {
                data.forEach(e => { processUrls(e); if (e.id) combinedEnemies[e.id] = e; });
            } else if (data && typeof data === 'object') {
                Object.entries(data).forEach(([key, e]) => { 
                    if (e && typeof e === 'object') {
                        processUrls(e);
                        const enemyId = e.id || key;
                        combinedEnemies[enemyId] = { ...e, id: enemyId }; 
                    }
                });
            }
        };
        processEnemies(mobsRes);
        processEnemies(elitesRes);
        processEnemies(bossesRes);
        setEnemyDb(combinedEnemies);

        let parsedSkinDb = [];
        if (Array.isArray(skinDbRes)) {
            skinDbRes.forEach(skin => {
                let imgPath = skin.imageUrl || skin.url;
                if (imgPath) skin.imageUrl = getImgUrl(imgPath);
                parsedSkinDb.push(skin);
            });
        } else if (skinDbRes && typeof skinDbRes === 'object') {
            Object.entries(skinDbRes).forEach(([key, val]) => {
                if (Array.isArray(val)) {
                    val.forEach(skin => {
                        let imgPath = skin.imageUrl || skin.url;
                        if (imgPath) skin.imageUrl = getImgUrl(imgPath);
                        parsedSkinDb.push({ charId: key, ...skin });
                    });
                }
            });
        }
        setSkinDb(parsedSkinDb);

        // --- 提取所有圖片並進行預先載入 ---
        const urlsToLoad = new Set();
        if (Array.isArray(charsRes)) charsRes.forEach(c => { if(c.imageUrl) urlsToLoad.add(c.imageUrl); urlsToLoad.add(getRoleIconUrl(c.role, c.element)); });
        Object.keys(skillRes || {}).forEach(k => urlsToLoad.add(getSkillIconUrl(k)));
        Object.keys(mobSkillRes || {}).forEach(k => urlsToLoad.add(getSkillIconUrl(k)));
        Object.keys(buffRes || {}).forEach(k => urlsToLoad.add(getBuffIconUrl(k)));
        Object.keys(BUFF_LOGIC).forEach(k => urlsToLoad.add(getBuffIconUrl(k)));
        if (Array.isArray(dungeonsRes)) dungeonsRes.forEach(d => { if(d.previewUrl) urlsToLoad.add(d.previewUrl); if(d.mapBgUrl) urlsToLoad.add(d.mapBgUrl); if(d.battleBgUrl) urlsToLoad.add(d.battleBgUrl); });
        if (Array.isArray(equipsRes)) equipsRes.forEach(e => { if(e.imageUrl) urlsToLoad.add(e.imageUrl); });
        if (Array.isArray(itemsRes)) itemsRes.forEach(i => { if(i.imageUrl) urlsToLoad.add(i.imageUrl); });
        else if (itemsRes && typeof itemsRes === 'object') Object.values(itemsRes).forEach(i => { if(i.imageUrl) urlsToLoad.add(i.imageUrl); });
        Object.values(parsedMatDb).forEach(m => { if(m.imageUrl) urlsToLoad.add(m.imageUrl); });
        Object.values(STATIC_MAT_URLS).forEach(url => urlsToLoad.add(url));
        Object.values(combinedEnemies).forEach(e => { if(e.imageUrl) urlsToLoad.add(e.imageUrl); });
        parsedSkinDb.forEach(s => { if(s.imageUrl) urlsToLoad.add(s.imageUrl); });

        const urlArray = Array.from(urlsToLoad);
        setLoadingState({ phase: 'images', loaded: 0, total: urlArray.length });
        
        let loadedCount = 0;
        await Promise.all(urlArray.map(url => new Promise(resolve => {
            const img = new Image();
            img.onload = () => { loadedCount++; setLoadingState({ phase: 'images', loaded: loadedCount, total: urlArray.length }); resolve(); };
            img.onerror = () => { loadedCount++; setLoadingState({ phase: 'images', loaded: loadedCount, total: urlArray.length }); resolve(); }; // 就算報錯也繼續，不卡死畫面
            img.src = url;
        })));

      } catch (error) { console.error("資料載入失敗:", error); } 
      finally { setIsLoading(false); }
    };
    loadAllData();
  }, []);

  useEffect(() => {
    if (screen === 'map' && mapScrollRef.current) {
      const el = mapScrollRef.current;
      const activeEl = el.querySelector('.active-node-layer');
      if (activeEl) el.scrollTo({ top: activeEl.offsetTop - el.clientHeight / 2 + 50, behavior: 'smooth' });
    }
  }, [screen, floor, activeNodes]);

  const getActiveCharImg = (char) => {
      if (!char) return null;
      if (globalStorage.charSkins && globalStorage.charSkins[char.id]) {
          return globalStorage.charSkins[char.id];
      }
      return char.imageUrl;
  };

  const showDialog = (title, text, type = 'alert', onConfirm = null, extraData = null) => { setDialog({ title, text, type, onConfirm, extraData }); };

  const calculateTooltipPosition = (x, y) => {
      const winW = window.innerWidth; const winH = window.innerHeight;
      let left = x + 15; let top = y + 15; let transformX = '0'; let transformY = '0';
      if (left + 260 > winW) { left = x - 10; transformX = '-100%'; }
      if (top + 300 > winH) { top = y + 20; transformY = '-100%'; }
      return { left, top, transform: `translate(${transformX}, ${transformY})` };
  };

  const handleTooltipOpen = (e, type, data, sumMode = false) => {
      e.stopPropagation(); const pos = calculateTooltipPosition(e.clientX, e.clientY);
      setGlobalTooltip({ type, data, sumMode, left: pos.left, top: pos.top, transform: pos.transform });
  };
  const handleTooltipMove = (e) => {
      if (globalTooltip) {
          const pos = calculateTooltipPosition(e.clientX, e.clientY);
          setGlobalTooltip(prev => ({ ...prev, left: pos.left, top: pos.top, transform: pos.transform }));
      }
  };
  const handleTooltipClose = () => setGlobalTooltip(null);

  const handleAssembleStart = (dungeonId, advLevel) => { 
      let newParty = [...partySlots];
      newParty.forEach(p => { 
          if(p) {
              p.baseStats.hp = getStats(p, true, globalStorage.charTiers, globalStorage.charEquips, {}).maxHp; 
              if (globalStorage.escapePenalty) p.baseStats.hp = Math.max(1, Math.floor(p.baseStats.hp * 0.5));
              p.energy = 0; p.buffs = [];
              p.baseStats.shield = 0;
              p.baseStats.permShield = 0;
              p.baseStats.tempShields = [];
          }
      });
      setRunDungeonLevel(advLevel); setPartySlots(newParty); 
      let deductAmount = Math.min(globalStorage.townGold || 0, 200);
      setGlobalStorage(prev => ({ ...prev, escapePenalty: false, townGold: Math.max(0, (prev.townGold || 0) - deductAmount) }));
      setMatsGainedThisRun({}); resetRunState(); setGold(deductAmount); initMap(1, dungeonId); 
  };

  const initMap = (f, dId = runDungeon) => {
    setFloor(f); setRunDungeon(dId); const newGraph = generateMapGraph();
    setMapGraph(newGraph); setActiveNodes(newGraph[0].nodes.map(n=>n.id)); setCurrentNodeInfo(null);
    setRunState(p => ({...p, floorMerchantEncountered: false}));
    if (partySlots.some(p => p && p.role === 'bishop') && itemDb['item_heal']) setRunItems(prev => [...prev, createInstancedItem('item_heal', 'common', itemDb)]);
    setScreen('map');
  };

  const enterNode = (node) => {
    setCurrentNodeInfo(node);
    let nextNodes = [];
    mapGraph.forEach(layer => { if (layer.level === parseInt(node.id.split('-')[0]) + 1) layer.nodes.forEach(n => { if (n.parents.includes(node.id)) nextNodes.push(n.id); }); });
    setActiveNodes(nextNodes);

    const nodeLevel = parseInt(node.id.split('-')[0]);
    const isFirstHalf = nodeLevel <= 4;
    const getShopRarity = () => {
        let roll = Math.random();
        if (floor === 1) {
            if (isFirstHalf) return roll < 0.1 ? 'rare' : (roll < 0.5 ? 'uncommon' : 'common');
            else return roll < 0.1 ? 'legendary' : (roll < 0.5 ? 'rare' : 'uncommon');
        } else if (floor === 2) {
            if (isFirstHalf) return roll < 0.2 ? 'legendary' : (roll < 0.7 ? 'rare' : 'uncommon');
            else return roll < 0.1 ? 'epic' : (roll < 0.6 ? 'legendary' : 'rare');
        } else {
            if (isFirstHalf) return roll < 0.5 ? 'epic' : 'legendary';
            else return roll < 0.1 ? 'mythic' : (roll < 0.6 ? 'epic' : 'legendary');
        }
    };

    if (node.type === 'camp') setScreen('camp');
    else if (node.type === 'shop') {
      setShopRefreshes({ weapon: false, head: false, body: false, shoes: false, accessory: false });
      let sItems = []; const keys = Object.keys(itemDb);
      if(keys.length > 0) {
          // 將 keys 打亂後取前 4 個不重複的道具
          let shuffledKeys = [...keys].sort(() => 0.5 - Math.random());
          let selectedKeys = shuffledKeys.slice(0, Math.min(4, keys.length));
          sItems = selectedKeys.map(k => createInstancedItem(k, RARITY_ORDER[randRange(0,2)], itemDb));
      }
      setShopItems(sItems);
      
      let sEqs = [];
      const existingNames = new Set();
      EQ_TYPES.forEach(t => {
          // 每個部位產生兩件裝備，防重複
          sEqs.push(generateUniqueEquip(floor, equipRecipes, getShopRarity(), t, existingNames));
          sEqs.push(generateUniqueEquip(floor, equipRecipes, getShopRarity(), t, existingNames));
      });
      setShopEquips(sEqs); setShopTab('buy_item'); setScreen('shop');
    } else if (node.type === 'event') {
      let possibleEvents = [
        { id: 'e_help', title: '援助他人', desc: '你在黑暗中看到一名受困的冒險者，並對他伸出了援手！' },
        { id: 'e_chest', title: '詛咒寶箱', desc: '一個散發著不詳氣息的寶箱，你忍受著詛咒的侵襲強行打開了它！' },
        { id: 'e_camp', title: '營火', desc: '在角落發現了一個未熄滅的營火，可以稍作休息。' }
      ];
      if (!runState.floorMerchantEncountered) possibleEvents.push({ id: 'e_merchant', title: '流浪商人', desc: '一位隱藏在陰影中的商人向你招手，他賣的東西似乎不一般。' });
      if (!runState.godEncountered) possibleEvents.push({ id: 'e_god', title: '神的寵召', desc: '一道聖光降臨，某位神明似乎看中了你的一名隊員。' });
      
      const evt = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
      setEventData(evt);
      
      // 自動觸發事件邏輯
      if (evt.id === 'e_help') {
         const stonesCount = randRange(2, 4);
         let obtainedStones = {};
         for(let i=0; i<stonesCount; i++) {
             let r = RARITY_ORDER[randRange(0, RARITY_ORDER.length-1)];
             obtainedStones[r] = (obtainedStones[r] || 0) + 1;
         }

         setGlobalStorage(prev => {
             let newRefineStones = { ...prev.refineStones };
             for (let r in obtainedStones) {
                 newRefineStones[r] = (newRefineStones[r] || 0) + obtainedStones[r];
             }
             return {...prev, upgradeStones: prev.upgradeStones + 1, refineStones: newRefineStones};
         });
         
         let msgNode = (
             <div className="flex flex-col items-center gap-2 text-sm mt-2">
                 <p className="text-gray-300 mb-2">援助了冒險者！他送你以下物品作為謝禮。<br/><span className="text-gray-400 text-xs">(已放入全局倉庫)</span></p>
                 <div className="flex items-center gap-2 font-bold text-blue-300 bg-gray-900/50 px-4 py-1.5 rounded-lg border border-gray-700">
                     {getMatImg('升階石') && <img src={getMatImg('升階石')} className="w-5 h-5 object-contain" alt=""/>} 升階石 x1
                 </div>
                 {Object.entries(obtainedStones).map(([r, count]) => {
                     const stoneName = RARITY_MAP[r].name + '強化石';
                     return (
                         <div key={r} className={`flex items-center gap-2 font-bold ${RARITY_MAP[r].color} bg-gray-900/50 px-4 py-1.5 rounded-lg border border-gray-700`}>
                             {getMatImg(stoneName) && <img src={getMatImg(stoneName)} className="w-5 h-5 object-contain" alt=""/>} {stoneName} x{count}
                         </div>
                     )
                 })}
             </div>
         );
         showDialog('援助成功', msgNode, 'alert');
      } else if (evt.id === 'e_chest') {
         let roll = Math.random();
         let chestRarity = 'common';
         if (floor === 1) chestRarity = roll < 0.3 ? 'rare' : (roll < 0.8 ? 'uncommon' : 'common');
         else if (floor === 2) chestRarity = roll < 0.15 ? 'epic' : (roll < 0.65 ? 'legendary' : 'rare');
         else chestRarity = roll < 0.15 ? 'mythic' : (roll < 0.6 ? 'epic' : 'legendary');

         let eq = generateEquip(floor, equipRecipes, chestRarity);
         setGlobalStorage(prev => ({...prev, equips: [...prev.equips, eq]}));
         let newParty = [...partySlots]; newParty.forEach(p => { if(p && p.baseStats.hp > 0) p.baseStats.hp = Math.max(1, Math.floor(p.baseStats.hp * 0.7)); });
         setPartySlots(newParty);
         showDialog('打開寶箱', '受到詛咒影響，全體成員失去30%當前生命值！\n獲得了珍奇的高階裝備！(已放入全局倉庫)', 'alert', null, { equipBox: eq });
      } else if (evt.id === 'e_merchant') {
         setRunState(p => ({...p, merchantEncountered: true, floorMerchantEncountered: true}));
         setShopRefreshes({ weapon: false, head: false, body: false, shoes: false, accessory: false });
         let keys = Object.keys(itemDb);
         if(keys.length > 0) {
             // 確保流浪商人賣的也是不重複的道具
             let shuffledKeys = [...keys].sort(() => 0.5 - Math.random());
             let selectedKeys = shuffledKeys.slice(0, Math.min(4, keys.length));
             const rarities = ['legendary', 'epic', 'rare', 'uncommon'];
             setShopItems(selectedKeys.map((k, idx) => createInstancedItem(k, rarities[idx % rarities.length], itemDb)));
         }
         let sEqs = [];
         const existingNames = new Set();
         EQ_TYPES.forEach(t => {
             // 每個部位產生兩件裝備，防重複
             sEqs.push(generateUniqueEquip(floor, equipRecipes, getShopRarity(), t, existingNames));
             sEqs.push(generateUniqueEquip(floor, equipRecipes, getShopRarity(), t, existingNames));
         });
         if (!runState.evoStoneBought) sEqs.push({ id: 'evt_stone', name: '進化石', desc: '能在公會提升角色階級', price: 500, type: 'stone', rarity: 'epic', soldOut: false, imageUrl: getMatData('進化石').imageUrl });
         setShopEquips(sEqs); setShopTab('buy_item'); setScreen('shop');
      } else if (evt.id === 'e_god') {
         setRunState(p => ({...p, godEncountered: true}));
         let eligible = partySlots.map((p,i) => p && (globalStorage.charTiers[p.id] || 0) < 5 ? i : null).filter(i => i !== null);
         if (eligible.length === 0) {
             setGlobalStorage(prev => ({...prev, evolutionStones: prev.evolutionStones + 1}));
             showDialog('神恩浩蕩', '隊伍全員皆已達到神話階級，神明賜予了 1 顆進化石。', 'alert');
         } else setEventData({...evt, selectionMode: true}); setScreen('event');
      } else if (evt.id === 'e_camp') {
         setScreen('camp');
      }
    } else {
      let draftParty = partySlots.filter(p=>p).map(p => ({
          ...JSON.parse(JSON.stringify(p)), skills: getActualSkills(p, globalStorage.churchUpgrades || []),
          maxHpLimit: getStats(p, true, globalStorage.charTiers, globalStorage.charEquips, runState).maxHp,
          _knightCritBonus: 0, _rookHealed: false
      }));
      if (draftParty.some(p => p && p.role === 'king' && p.baseStats.hp > 0)) draftParty.forEach(p => { if(p) p.energy = Math.min(100, p.energy + 10); });
      
      setBattleState({ party: draftParty, enemies: generateEnemiesDynamic(node.type, floor, runDungeon, dungeonList, runDungeonLevel, enemyDb, materialDb), skillUseCount: 0 });
      setSkillCooldowns({}); setUltToggled([false, false, false, false]); setBattlePhase('idle'); setItemPanelOpen(false); setPopups([]); setFocusedEnemy(null); setBossEpLog([]); setBossTierUpgradeLog([]); setScreen('battle');
    }
  };

  const handleReturnToTown = () => {
     showDialog('返回城鎮', '現在返回城鎮將會機率遺失本次探索收集到的素材，且下次出發時全隊將受到 50% 生命值的懲罰傷害。確定要返回嗎？', 'confirm', () => {
         let lostCount = 0;
         setGlobalStorage(prev => {
             let newMats = {...prev.materials};
             Object.entries(matsGainedThisRun).forEach(([mName, mQty]) => { for(let i=0; i<mQty; i++) { if(Math.random() < 0.5) { newMats[mName] = Math.max(0, (newMats[mName] || 0) - 1); lostCount++; } } });
             return {...prev, materials: newMats, escapePenalty: true};
         });
         let newParty = [...partySlots]; newParty.forEach(p => { if(p) p.energy = 0; });
         setPartySlots(newParty); setRunItems([]); resetRunState(); setScreen('town');
         if(lostCount > 0) setTimeout(() => showDialog('已返回', `返回途中因為匆忙，遺失了 ${lostCount} 個近期收集的素材。`, 'alert'), 300);
     });
  };

  const handleClaimLoot = () => {
    let addedGold = 0;
    let addedFlowers = 0;
    let addedEquips = [];
    let addedMats = {};
    let addedUpgStones = 0;
    let addedEvoStones = 0;

    postBattleLoot.forEach(loot => {
      if (!loot.selected) return;
      if (loot.type === 'gold') {
        addedGold += loot.val;
      } else if (loot.type === 'flower') {
        addedFlowers += loot.val;
      } else if (loot.type === 'equip') {
        addedEquips.push(loot.data);
      } else if (loot.type === 'mat' || loot.type === 'colosStone') {
        addedMats[loot.data.name] = (addedMats[loot.data.name] || 0) + (loot.data.val || loot.val);
      } else if (loot.type === 'upgStone') {
        addedUpgStones += loot.val;
      } else if (loot.type === 'evoStone') {
        addedEvoStones += loot.val;
      }
    });

    setGold(prev => prev + addedGold);
    setGlobalStorage(prev => {
      let nextMats = { ...prev.materials };
      Object.entries(addedMats).forEach(([mName, qty]) => {
        nextMats[mName] = (nextMats[mName] || 0) + qty;
      });
      return {
        ...prev,
        wishFlowers: prev.wishFlowers + addedFlowers,
        equips: [...prev.equips, ...addedEquips],
        materials: nextMats,
        upgradeStones: (prev.upgradeStones || 0) + addedUpgStones,
        evolutionStones: (prev.evolutionStones || 0) + addedEvoStones
      };
    });

    setMatsGainedThisRun(prev => {
      let nextRunMats = { ...prev };
      Object.entries(addedMats).forEach(([mName, qty]) => {
        nextRunMats[mName] = (nextRunMats[mName] || 0) + qty;
      });
      return nextRunMats;
    });

    if (currentNodeInfo?.type === 'boss') {
      if (floor < 3) {
         showDialog('通關成功', `恭喜通關第 ${floor} 層！即將前往下一層。`, 'alert', () => {
             setGlobalStorage(prev => {
                 let nextDungeons = { ...prev.unlockedDungeonLevels };
                 let currentMax = nextDungeons[runDungeon] || 0;
                 if (runDungeonLevel === currentMax && currentMax < 3) {
                     nextDungeons[runDungeon] = currentMax + 1;
                 }
                 return { ...prev, unlockedDungeonLevels: nextDungeons };
             });
             initMap(floor + 1, runDungeon);
         });
      } else {
         setGlobalStorage(prev => {
             let nextDungeons = { ...prev.unlockedDungeonLevels };
             let currentMax = nextDungeons[runDungeon] || 0;
             if (runDungeonLevel === currentMax && currentMax < 3) {
                 nextDungeons[runDungeon] = currentMax + 1;
             }
             return {
                 ...prev,
                 unlockedDungeonLevels: nextDungeons,
                 townGold: prev.townGold + gold + addedGold
             };
         });
         setScreen('victory');
      }
    } else {
      setScreen('map');
    }
  };

  const handleVictoryReturn = () => {
     setRunItems([]);
     resetRunState();
     setScreen('town');
  };

  const handleEventChoice = (action) => {
    // 由於事件改為自動觸發，這裡的選擇邏輯已不再需要，保留以防後續擴充
    setScreen('map');
  };

  const handleGodBless = (charIdx) => {
     let p = partySlots[charIdx]; if(!p) return;
     let t = globalStorage.charTiers[p.id] || 0;
     if (t >= 5) return showDialog('無法賜福', '該角色已達最高階級！');
     setGlobalStorage(prev => ({...prev, charTiers: {...prev.charTiers, [p.id]: t + 1}}));
     showDialog('神的賜福', `神的光輝籠罩了 ${p.name}，階級提升了！`, 'alert', () => setScreen('map'));
  };

  const addPopup = (side, idx, text, color, options = {}) => {
    const id = getPopupId(); 
    // 生成拋物線動畫所需的隨機偏移變數，若有給定 offsetX/Y 則優先使用
    const tx = options.offsetX !== undefined ? options.offsetX : randRange(-60, 60);
    const ty = options.offsetY !== undefined ? options.offsetY : randRange(-80, -30);
    setPopups(prev => [...prev, { id, side, idx, text, color, tx, ty, ...options }]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== id)), (options.duration || 2000) + (options.delay || 0));
  };

  const addHitFlash = (side, idx) => {
    const id = getPopupId();
    setHitFlashes(prev => [...prev, { id, side, idx }]);
    setTimeout(() => setHitFlashes(prev => prev.filter(p => p.id !== id)), 300);
  };

  // 中央統一處理狀態滿層觸發邏輯
  const checkMaxStacksTriggers = (draft) => {
      const processEntity = (entity, side, idx) => {
          if (!entity || entity.baseStats.hp <= 0) return;
          let buffsToRemove = [];
          
          entity.buffs.forEach(b => {
              const bDef = BUFF_DB[b.type] || {};
              const maxS = bDef.maxStacks !== undefined ? bDef.maxStacks : (b.type === 'fortress' ? 12 : 99);

              if (b.stacks >= maxS) {
                  // Hardcoded 特例：堅守反擊
                  if (b.type === 'fortress') {
                      b.stacks = 0;
                      let pStats = getStats(entity, side === 'party', globalStorage.charTiers, globalStorage.charEquips, runState);
                      let fdmg = Math.floor(pStats.pdef * 2.5 + pStats.mdef * 2.5);
                      draft.enemies.forEach((e, eidx) => {
                          if (e.baseStats.hp > 0) {
                              e.baseStats.hp -= fdmg;
                              addPopup('enemy', eidx, fdmg.toString(), 'text-indigo-400 font-bold scale-150');
                          }
                      });
                      addPopup(side, idx, '堅守反擊', 'text-indigo-300 font-bold');
                  }
                  // JSON 動態定義的滿層效果
                  else if (bDef.trigger && bDef.trigger.onMaxStacks) {
                      const onMax = bDef.trigger.onMaxStacks;
                      const onRemove = onMax.onRemove;

                      if (onRemove && onRemove.type === 'damage') {
                          let targetStats = getStats(entity, side === 'party', globalStorage.charTiers, globalStorage.charEquips, runState);
                          let refStats = b.casterStats || targetStats;
                          if (b.casterId && b.casterSide && draft[b.casterSide]) {
                              const liveCaster = draft[b.casterSide].find(c => c && c.id === b.casterId);
                              if (liveCaster && liveCaster.baseStats.hp > 0) {
                                  refStats = getStats(liveCaster, b.casterSide === 'party', globalStorage.charTiers, globalStorage.charEquips, runState);
                              }
                          }

                          let evalFormula = (onRemove.damageFormula || "50")
                              .replace(/\bmAtk\b/gi, refStats.mAtk || refStats.matk || 0)
                              .replace(/\bpAtk\b/gi, refStats.pAtk || refStats.atk || 0)
                              .replace(/\bmDef\b/gi, refStats.mDef || refStats.mdef || 0)
                              .replace(/\bpDef\b/gi, refStats.pDef || refStats.pdef || 0)
                              .replace(/\bmaxHp\b/gi, refStats.maxHp || 0);

                          let dmgVal = 50;
                          try { dmgVal = Math.floor(new Function('return ' + evalFormula)()); } catch (e) { }

                          if (onRemove.target === 'self') {
                              let finalDmg = dmgVal;
                              if (entity.baseStats.shield > 0) {
                                  if (entity.baseStats.tempShields && entity.baseStats.tempShields.length > 0) {
                                      for (let i = 0; i < entity.baseStats.tempShields.length; i++) {
                                          if (finalDmg <= 0) break;
                                          let ts = entity.baseStats.tempShields[i];
                                          if (ts.amt > 0) {
                                              if (finalDmg <= ts.amt) { ts.amt -= finalDmg; finalDmg = 0; }
                                              else { finalDmg -= ts.amt; ts.amt = 0; }
                                          }
                                      }
                                      entity.baseStats.tempShields = entity.baseStats.tempShields.filter(ts => ts.amt > 0);
                                  }
                                  if (finalDmg > 0 && (entity.baseStats.permShield || 0) > 0) {
                                      if (finalDmg <= entity.baseStats.permShield) { entity.baseStats.permShield -= finalDmg; finalDmg = 0; }
                                      else { finalDmg -= entity.baseStats.permShield; entity.baseStats.permShield = 0; }
                                  }
                                  entity.baseStats.shield = (entity.baseStats.permShield || 0) + (entity.baseStats.tempShields || []).reduce((sum, s) => sum + s.amt, 0);
                              }
                              entity.baseStats.hp -= finalDmg;
                              addHitFlash(side, idx);
                              addPopup(side, idx, dmgVal.toString(), onRemove.color || 'text-purple-500 font-black scale-125 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]', { offsetY: -30 });
                          }
                      }

                      if (onMax.removeBuff === 'true' || onMax.removeBuff === true) {
                          buffsToRemove.push(b.type);
                      } else {
                          b.stacks = 0;
                      }
                  }
              }
          });
          if (buffsToRemove.length > 0) {
              entity.buffs = entity.buffs.filter(b => !buffsToRemove.includes(b.type));
          }
      };

      draft.party.forEach((p, i) => processEntity(p, 'party', i));
      draft.enemies.forEach((e, i) => processEntity(e, 'enemy', i));
  };

  const handleUseItem = (itemData) => {
    if (battlePhase !== 'idle') return;
    if (itemData.targetType === 'player_single' || itemData.targetType === 'enemy_single') { setPendingTarget({ type: 'item', itemData, targetType: itemData.targetType }); setItemPanelOpen(false); } 
    else { executeItem(itemData, null); setItemPanelOpen(false); }
  };

  const executeItem = (itemData, targetIdx) => {
    let draft = JSON.parse(JSON.stringify(battleState));
    
    // 執行道具自帶的 effectFn，並將當下體質與狀態傳入
    let resultObj = itemData.effect(draft, targetIdx, globalStorage.charTiers, globalStorage.charEquips, runState);
    
    // 渲染彈出文字
    if(resultObj?.popups) resultObj.popups.forEach(p => addPopup(p.side, p.idx, p.text, p.color, p));
    
    checkMaxStacksTriggers(draft); // 新增上限檢查

    setBattleState(draft); 
    setPendingTarget(null);
    
    // 從背包中扣除該實例化道具
    setRunItems(prev => prev.filter(it => it.instanceId !== itemData.instanceId));
    
    // 判定是否因為道具(例如傷害卷軸)導致敵方全滅，並進入結算
    if (draft.enemies.every(e => e.baseStats.hp <= 0)) { 
        setBattlePhase('executing'); 
        setTimeout(() => handleBattleEnd(draft), 1000); 
    }
  };

  const handleSkillClick = (casterIdx, skillIdx) => {
    if (battlePhase !== 'idle') return;
    const cdKey = `${casterIdx}_${skillIdx}`;
    if (skillCooldowns[cdKey] > 0) return;
    
    const caster = battleState.party[casterIdx];
    if (isSilenced(caster)) {
        showDialog('無法行動', '該角色處於冰晶或封印狀態，無法使用技能。');
        return;
    }

    const skillId = battleState.party[casterIdx].skills[skillIdx]; 
    const tType = SKILL_DB[skillId].targetType;
    
    // 如果是 enemy_single 技能，判斷是否已手動鎖定目標。若無，則自動攻擊最左側存活目標。
    if (tType === 'enemy_single') {
        let targetIdx = -1;
        if (focusedEnemy) {
            targetIdx = battleState.enemies.findIndex(e => e.id === focusedEnemy && e.baseStats.hp > 0);
        }
        if (targetIdx === -1) {
            // 自動尋找陣列中最左側 (第一個索引) 存活的敵人
            targetIdx = battleState.enemies.findIndex(e => e && e.baseStats.hp > 0);
        }
        if (targetIdx !== -1) {
            executeSkill(casterIdx, skillIdx, skillId, targetIdx);
        } else {
            showDialog('施放失敗', '目前沒有存活的敵方目標。');
        }
    } else if (tType === 'player_single') { 
        setPendingTarget({ type: 'skill', casterIdx, skillIdx, skillId, targetType: tType }); 
    } else {
        executeSkill(casterIdx, skillIdx, skillId, tType === 'self' ? casterIdx : null);
    }
  };

  const executeSkill = (casterIdx, skillIdx, skillId, targetIdx) => {
    const skillDef = SKILL_DB[skillId]; let draft = JSON.parse(JSON.stringify(battleState));
    setFlashUnit({ side: 'party', idx: casterIdx }); 
    addPopup('party', casterIdx, skillDef.name, 'text-yellow-400 scale-125 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)] z-50');
    let resultObj = skillDef.effect(draft, casterIdx, targetIdx, globalStorage.charTiers, globalStorage.charEquips, runState, (tSide, tIdx, dmgObj, aSide, aIdx) => applyDamageToDraft(draft, tSide, tIdx, dmgObj, aSide, aIdx), skillDef);
    if(resultObj?.popups) resultObj.popups.forEach(p => addPopup(p.side, p.idx, p.text, p.color, p));
    
    checkMaxStacksTriggers(draft); // 新增上限檢查
    
    setBattleState(draft); setSkillCooldowns({...skillCooldowns, [`${casterIdx}_${skillIdx}`]: skillDef.cd}); setPendingTarget(null);
    setTimeout(() => setFlashUnit(null), 300);
    if (draft.enemies.every(e => e.baseStats.hp <= 0)) { setBattlePhase('executing'); setTimeout(() => handleBattleEnd(draft), 1000); }
  };

  const applyDamageToDraft = (draft, side, targetIdx, dmgObj, attackerSide, attackerIdx) => {
    let targetRef = side === 'party' ? draft.party[targetIdx] : draft.enemies[targetIdx];
    let attackerRef = attackerSide === 'party' ? draft.party[attackerIdx] : (attackerSide === 'enemy' ? draft.enemies[attackerIdx] : null);
    if(!targetRef || targetRef.baseStats.hp <= 0) return;

    let baseColor = ELEMENT_COLORS[dmgObj.element] || 'text-white';
    let colorClass = baseColor; let badges = [];
    if (dmgObj.isCrit) badges.push({text: 'CRITICAL', color: `${baseColor} drop-shadow-[0_1px_2px_rgba(0,0,0,1)]`});
    if (dmgObj.eleMsg === 'WEAK') badges.push({text: 'WEAK', color: 'text-red-400 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]'});
    else if (dmgObj.eleMsg === 'RESIST') badges.push({text: 'RESIST', color: 'text-gray-400 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]'});

    if (dmgObj.eleMsg === 'WEAK') colorClass += ' font-black drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]';
    else if (dmgObj.eleMsg === 'RESIST') colorClass = `${baseColor} opacity-60 scale-90`;
    colorClass += dmgObj.isCrit ? ' scale-125 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)] font-black' : ' font-bold';

    let actualDmg = dmgObj.dmg;
    if (targetRef.baseStats.shield > 0) {
        if (targetRef.baseStats.tempShields && targetRef.baseStats.tempShields.length > 0) {
            for (let i = 0; i < targetRef.baseStats.tempShields.length; i++) {
                if (actualDmg <= 0) break;
                let ts = targetRef.baseStats.tempShields[i];
                if (ts.amt > 0) {
                    if (actualDmg <= ts.amt) { ts.amt -= actualDmg; actualDmg = 0; } 
                    else { actualDmg -= ts.amt; ts.amt = 0; }
                }
            }
            targetRef.baseStats.tempShields = targetRef.baseStats.tempShields.filter(ts => ts.amt > 0);
        }
        if (actualDmg > 0 && (targetRef.baseStats.permShield || 0) > 0) {
            if (actualDmg <= targetRef.baseStats.permShield) { targetRef.baseStats.permShield -= actualDmg; actualDmg = 0; } 
            else { actualDmg -= targetRef.baseStats.permShield; targetRef.baseStats.permShield = 0; }
        }
        targetRef.baseStats.shield = (targetRef.baseStats.permShield || 0) + (targetRef.baseStats.tempShields || []).reduce((sum, s) => sum + s.amt, 0);
    }
    let hpBefore = targetRef.baseStats.hp;
    targetRef.baseStats.hp -= actualDmg;
    
    // 觸發紅閃特效
    addHitFlash(side, targetIdx);
    
    addPopup(side, targetIdx, dmgObj.dmg.toString(), colorClass, { badges, offsetX: randRange(-20, 20), offsetY: randRange(-15, 15) });
    
    // 最後一擊判斷 (獲得 5EP)
    if (hpBefore > 0 && targetRef.baseStats.hp <= 0 && attackerRef && attackerSide === 'party') {
        attackerRef.energy = Math.min(100, attackerRef.energy + 5);
        addPopup('party', attackerIdx, '+5 EP', 'text-yellow-400 font-bold drop-shadow-md', { offsetY: -40 });
    }

    // --- 動態 Buff 疊層 / 術禍 / 堅守等受擊觸發機制升級 ---
    targetRef.buffs = targetRef.buffs.map(b => {
        const bDef = BUFF_DB[b.type];
        if (bDef && bDef.trigger && bDef.trigger.onHit) {
            const onHit = bDef.trigger.onHit;
            if (onHit.addStacks === 'hits') {
                // 排除堅守(以防重複計數其特有邏輯)
                if (b.type === 'fortress') return b;
                
                b.stacks = (b.stacks || 0) + 1;
                const maxS = bDef.maxStacks || 8;
                if (b.stacks > maxS) b.stacks = maxS;
            }
        }
        return b;
    }).filter(Boolean);

    if (side === 'party' && targetRef.role === 'rook' && !targetRef._rookHealed) {
        targetRef._rookHealed = true;
          draft.party.forEach((p, pIdx) => {
             if (p.baseStats.hp > 0) {
                 let missing = (p.maxHpLimit || getStats(p, true, globalStorage.charTiers, globalStorage.charEquips, runState).maxHp) - p.baseStats.hp;
                 let heal = Math.floor(missing * 0.2);
                 if (heal > 0) { 
                     let res = applyHeal(p, heal, true, globalStorage.charTiers, globalStorage.charEquips, runState, null);
                     addPopup('party', pIdx, `+${res.val}`, 'text-green-400 font-bold scale-110'); 
                 }
             }
          });
          addPopup('party', targetIdx, '城堡庇護', 'text-yellow-300 font-bold');
      }

      if (side === 'party') {
          let fortressBuff = targetRef.buffs.find(b => b.type === 'fortress');
          if (fortressBuff) {
             fortressBuff.stacks = Math.min(12, fortressBuff.stacks + 1);
          }
          let holyBlessBuff = targetRef.buffs.find(b => b.type === 'holyBless');
          if (holyBlessBuff && holyBlessBuff.stacks > 0) holyBlessBuff.stacks -= 1;

          let hasSpikes = targetRef.buffs.find(b => b.type === 'queenSpikes');
          if (hasSpikes && hasSpikes.stacks > 0) {
              const qStats = getStats(draft.party.find(p=>p.role==='queen') || targetRef, true, globalStorage.charTiers, globalStorage.charEquips, runState);
              const reboundDmg = Math.floor(qStats.matk * 2.0);
              if (attackerRef && attackerRef.baseStats.hp > 0) { attackerRef.baseStats.hp -= reboundDmg; setTimeout(() => addPopup(attackerSide, attackerIdx, reboundDmg.toString(), 'text-purple-400 font-bold scale-110'), 200); }
              hasSpikes.stacks -= 1;
          }

          let windGuardBuff = targetRef.buffs.find(b => b.type === 'windGuard');
          if (windGuardBuff && windGuardBuff.stacks > 0) {
              windGuardBuff.stacks -= 1; let tStats = getStats(targetRef, true, globalStorage.charTiers, globalStorage.charEquips, runState);
              let healAmt = Math.floor(20 + 0.1 * tStats.pdef + 0.1 * tStats.mdef);
              let res = applyHeal(targetRef, healAmt, side === 'party', globalStorage.charTiers, globalStorage.charEquips, runState, tStats);
              addPopup(side, targetIdx, `+${res.val}`, 'text-green-400 font-bold scale-110');
          }
      }

      if (attackerRef) {
        if (attackerRef.buffs.some(b => b.type === 'breaker')) {
            addBuffToEntity(targetRef, { type: 'pDefDown', val: 0.02, duration: 3 });
            addBuffToEntity(targetRef, { type: 'mDefDown', val: 0.02, duration: 3 });
            addPopup(side, targetIdx, '防禦下降', 'text-gray-400', {isBuff: true, isDebuff: true, delay: 0});
        }
        if (attackerRef.buffs.some(b => b.type === 'monarch') && attackerSide === 'party') {
            const monarchDef = BUFF_DB['monarch'] || {};
            const triggerVal = monarchDef.val !== undefined ? monarchDef.val : 0.02;
            const triggerDuration = monarchDef.duration !== undefined ? monarchDef.duration : 2;
            const triggerBuffs = monarchDef.triggerBuffs || ['pAtkUp', 'mAtkUp'];
            
            draft.party.forEach(p => { 
                if (p.baseStats.hp > 0) {
                    triggerBuffs.forEach(tbType => {
                        addBuffToEntity(p, { type: tbType, val: triggerVal, duration: triggerDuration, casterId: attackerRef.id, casterSide: attackerSide });
                    });
                }
            });
        }
        let fierceBuff = attackerRef.buffs.find(b => b.type === 'fierceKnight');
        if (fierceBuff && fierceBuff.stacks > 0) { addBuffToEntity(attackerRef, { type: 'critDmgUp', val: 0.1, duration: 2 }); fierceBuff.stacks -= 1; }
        
        // 動態解析攻擊者身上的攻擊觸發增益 (如: 烽火 攻擊時賦予灼傷)
        attackerRef.buffs.forEach(b => {
            const bDef = BUFF_DB[b.type];
            if (bDef && bDef.trigger && bDef.trigger.onDealDamage) {
                const trig = bDef.trigger.onDealDamage;
                if (trig.type === 'applyDebuff' && trig.target === 'hit_target') {
                    const debuffId = trig.buffId;
                    const dDuration = trig.duration !== undefined ? trig.duration : 2;
                    const dStacks = trig.addStacks !== undefined ? trig.addStacks : 1;
                    if (debuffId) {
                        addBuffToEntity(targetRef, { type: debuffId, stacks: dStacks, duration: dDuration, casterId: attackerRef.id, casterSide: attackerSide });
                        addPopup(side, targetIdx, BUFF_DB[debuffId]?.name || debuffId, 'text-red-500', {isBuff: true, isDebuff: true, delay: 0});
                    }
                }
            }
        });
    }
};

const executeAttackPhase = async () => {
    if (battlePhase !== 'idle') return; setBattlePhase('executing'); setPendingTarget(null); setItemPanelOpen(false);
    let draft = JSON.parse(JSON.stringify(battleState));
    const updateAndWait = async (ms = 200) => { 
        checkMaxStacksTriggers(draft); // 新增回合內疊層上限檢查
        setBattleState(JSON.parse(JSON.stringify(draft))); 
        await sleep(ms); 
    };

    const applyUltBuff = (target, buffDef, casterId, casterSide) => {
        let caster = draft[casterSide].find(c => c && c.id === casterId);
        let casterStatsSnapshot = caster ? getStats(caster, casterSide === 'party', globalStorage.charTiers, globalStorage.charEquips, runState) : null;
        addBuffToEntity(target, { ...buffDef, casterId, casterSide, casterStats: casterStatsSnapshot });
    };

    for (let i = 0; i < draft.party.length; i++) {
      let char = draft.party[i]; if (char.baseStats.hp <= 0) continue;
      let aliveEnemies = draft.enemies.map((e, idx) => ({...e, originalIdx: idx})).filter(e => e.baseStats.hp > 0);
      if (aliveEnemies.length === 0) break; 

      let useUlt = ultToggled[i] && char.energy >= 100;
      if (useUlt && isSilenced(char)) {
          addPopup('party', i, '封印', 'text-cyan-300 font-bold scale-110');
          useUlt = false;
          setUltToggled(prev => { let n = [...prev]; n[i] = false; return n; });
      }

      if (useUlt) {
        char.energy = 0; const ultDef = ULT_DB[char.ult];
        let cStats = getStats(char, true, globalStorage.charTiers, globalStorage.charEquips, runState);
        setFlashUnit({ side: 'party', idx: i, isUlt: true }); 
        addPopup('party', i, ultDef.name, 'text-red-500 font-black scale-125 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] tracking-widest z-50');
        await sleep(400); 

        if (ultDef.type === 'support') {
           let pBuffs = ultDef.partyBuff || (ultDef.calcPartyBuff ? ultDef.calcPartyBuff(cStats) : null);
           if (pBuffs) pBuffs.forEach((db, dbIdx) => draft.party.forEach((p, pIdx) => { if (p.baseStats.hp > 0) { applyUltBuff(p, db, char.id, 'party'); addPopup('party', pIdx, db.type, '', {isBuff:true, isDebuff: false, delay: dbIdx * 300}); } }));
           
           let eDebuffs = ultDef.debuffAll || (ultDef.calcDebuffAll ? ultDef.calcDebuffAll(cStats) : null);
           if (eDebuffs) eDebuffs.forEach((db, dbIdx) => draft.enemies.forEach((e, eIdx) => { if (e.baseStats.hp > 0) { applyUltBuff(e, db, char.id, 'party'); addPopup('enemy', eIdx, db.type, '', {isBuff:true, isDebuff: true, delay: dbIdx * 300}); } }));
           
           if (ultDef.postEffect) ultDef.postEffect(char, draft, addPopup);
        } else if (ultDef.type === 'heal') {
          let healAmt = ultDef.calcHeal ? ultDef.calcHeal(cStats) : Math.floor(cStats.matk * (ultDef.multiplier || 1.0));
          draft.party.forEach((p, pIdx) => {
             if(p.baseStats.hp > 0) {
                let res = applyHeal(p, healAmt, true, globalStorage.charTiers, globalStorage.charEquips, runState, cStats);
                if(ultDef.partyBuff) ultDef.partyBuff.forEach((db, dbIdx) => { applyUltBuff(p, db, char.id, 'party'); addPopup('party', pIdx, db.type, '', {isBuff:true, isDebuff: false, delay: dbIdx * 300}); });
                let color = res.isCrit ? 'text-green-300 font-black scale-125 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'text-green-400 font-bold scale-110';
                let badges = []; if(res.isCrit) badges.push({text: 'CRITICAL', color: 'text-green-300 drop-shadow-md'});
                addPopup('party', pIdx, `+${res.val}`, color, {badges});
             }
          });
        } else if (ultDef.type === 'damage') {
           let targets = (ultDef.targetType === 'enemy_all') ? aliveEnemies : ((focusedEnemy !== null && aliveEnemies.find(e => e.id === focusedEnemy)) ? [aliveEnemies.find(e => e.id === focusedEnemy)] : [aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]]);
           for (let target of targets) {
             let totalUltDmg = 0; let actualUltHits = 0; let realTargetRef = draft.enemies[target.originalIdx];
             for(let h=0; h < (ultDef.hits || 1); h++) {
               let baseDmgOverride = ultDef.calcBaseDmg ? ultDef.calcBaseDmg(cStats, char, draft) : null;
               let { dmg, isCrit, eleMsg, element } = calcDamage(char, realTargetRef, char.type, ultDef.multiplier || 1.0, true, false, globalStorage.charTiers, globalStorage.charEquips, runState, baseDmgOverride);
               applyDamageToDraft(draft, 'enemy', target.originalIdx, {dmg, isCrit, eleMsg, element}, 'party', i); 
               totalUltDmg += dmg; actualUltHits++; await sleep(150);
             }
             if (actualUltHits > 1 && totalUltDmg > 0) addPopup('enemy', target.originalIdx, `${totalUltDmg}`, `${ELEMENT_COLORS[char.element]} scale-[2] font-black drop-shadow-[0_0_15px_rgba(250,204,21,1)] z-50`, { duration: 2000, offsetX: 0, offsetY: -60 });
             realTargetRef.energy = Math.min(100, realTargetRef.energy + randRange(2,6));
             if (ultDef.debuff) ultDef.debuff.forEach((db, dbIdx) => { applyUltBuff(realTargetRef, db, char.id, 'party'); addPopup('enemy', target.originalIdx, db.type, '', {isBuff:true, isDebuff: true, delay: dbIdx * 300}); });
             if(realTargetRef.baseStats.hp <= 0 && focusedEnemy === target.id) setFocusedEnemy(null);
           }
           if (ultDef.partyBuff) ultDef.partyBuff.forEach((db, dbIdx) => draft.party.forEach((p, pIdx) => { if (p.baseStats.hp > 0) { applyUltBuff(p, db, char.id, 'party'); addPopup('party', pIdx, db.type, '', {isBuff:true, isDebuff: false, delay: dbIdx * 300}); } }));
           if (ultDef.postEffect) ultDef.postEffect(char, draft, addPopup);
        }
        setFlashUnit(null); await updateAndWait(250);
      } else {
        let stats = getStats(char, true, globalStorage.charTiers, globalStorage.charEquips, runState);
        let hits = Math.random() < stats.ta ? 3 : Math.random() < stats.da ? 2 : 1;
        let target = (focusedEnemy !== null && aliveEnemies.find(e => e.id === focusedEnemy)) ? aliveEnemies.find(e => e.id === focusedEnemy) : aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
        let realTargetRef = draft.enemies[target.originalIdx];

        let totalDmg = 0; let actualHits = 0;
        for (let h = 0; h < hits; h++) {
           if(realTargetRef.baseStats.hp <= 0) break;
           setFlashUnit({ side: 'party', idx: i });
           if (h > 0) addPopup('party', i, h === 1 ? 'DA!' : 'TA!', 'text-blue-300 font-bold');
           let { dmg, isCrit, eleMsg, element } = calcDamage(char, realTargetRef, char.type, 1.0, true, false, globalStorage.charTiers, globalStorage.charEquips, runState);
           applyDamageToDraft(draft, 'enemy', target.originalIdx, {dmg, isCrit, eleMsg, element}, 'party', i);
           totalDmg += dmg; actualHits++;
           char.energy = Math.min(100, char.energy + randRange(2, 6)); realTargetRef.energy = Math.min(100, realTargetRef.energy + randRange(2, 6));
           if(realTargetRef.baseStats.hp <= 0 && focusedEnemy === target.id) setFocusedEnemy(null);
           await updateAndWait(150); setFlashUnit(null); await sleep(200); 
        }
      }
    }

    if (draft.enemies.every(e => e.baseStats.hp <= 0)) { setBattleState(draft); await sleep(1000); handleBattleEnd(draft); return; }

    for (let i = 0; i < draft.enemies.length; i++) {
      let enemy = draft.enemies[i]; if (enemy.baseStats.hp <= 0) continue;
      
      let eStats = getStats(enemy, false, globalStorage.charTiers, {}, runState);
      let isBoss = enemy.id.startsWith('boss_');
      let actionCount = isBoss ? 3 : (Math.random() < eStats.ta ? 3 : Math.random() < eStats.da ? 2 : 1);

      for (let a = 0; a < actionCount; a++) {
          if (enemy.baseStats.hp <= 0) break;
          let aliveParty = draft.party.map((p, idx) => ({...p, originalIdx: idx})).filter(p => p.baseStats.hp > 0);
          if (aliveParty.length === 0) break;

          let tauntTargets = aliveParty.filter(p => p.buffs.some(b => b.type === 'taunt'));
          let target = (tauntTargets.length > 0 ? tauntTargets : aliveParty)[Math.floor(Math.random() * (tauntTargets.length > 0 ? tauntTargets.length : aliveParty.length))];
          let realTargetRef = draft.party[target.originalIdx];
          
          let triggeredSkillId = null;
          if (enemy.skills && enemy.skills.length > 0 && !isSilenced(enemy)) {
              for (let sId of enemy.skills) {
                  let sDef = mobSkillDb[sId];
                  let cd = enemy.skillCooldowns?.[sId] || 0;
                  if (sDef && cd <= 0) {
                      let rate = sDef.rate !== undefined ? sDef.rate : 0.3;
                      if (Math.random() < rate) {
                          triggeredSkillId = sId;
                          break;
                      }
                  }
              }
          }

          if (triggeredSkillId) {
              let sDef = mobSkillDb[triggeredSkillId];
              let skillName = sDef.name || triggeredSkillId;
              setFlashUnit({ side: 'enemy', idx: i });
              if (a > 0) addPopup('enemy', i, a === 1 ? 'DA!' : 'TA!', 'text-red-400 font-bold', { offsetY: -30 });
              addPopup('enemy', i, skillName, 'text-red-400 font-bold scale-125 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] z-50');
              
              enemy.skillCooldowns = enemy.skillCooldowns || {};
              enemy.skillCooldowns[triggeredSkillId] = 2;
              
              let aliveEnemies = draft.enemies.map((e, idx) => ({...e, originalIdx: idx})).filter(e => e.baseStats.hp > 0);
              const getTargets = (tType, defaultTgt) => {
                  if (!tType) return [defaultTgt];
                  if (tType === 'self') return [{ side: 'enemy', idx: i, ref: draft.enemies[i] }];
                  if (tType === 'enemy_all' || tType === 'player_all' || tType === 'party_all') return aliveParty.map(p => ({ side: 'party', idx: p.originalIdx, ref: draft.party[p.originalIdx] }));
                  if (tType === 'ally_all' || tType === 'enemy_side_all') return aliveEnemies.map(e => ({ side: 'enemy', idx: e.originalIdx, ref: draft.enemies[e.originalIdx] }));
                  if (tType === 'enemy_single' || tType === 'player_single' || tType === 'party_single') return [defaultTgt];
                  if (tType === 'ally_single') return [{ side: 'enemy', idx: i, ref: draft.enemies[i] }]; 
                  return [defaultTgt];
              };

              let defaultTargetObj = { side: 'party', idx: target.originalIdx, ref: realTargetRef };
              let baseTargets = getTargets(sDef.targetType, defaultTargetObj);

              let factorVal = 0;
              if (sDef.factors && Array.isArray(sDef.factors)) {
                  factorVal = sDef.factors.reduce((sum, f) => sum + (eStats[f.stat] || 0) * (f.value || 0), 0);
              }

              if (sDef.damage) {
                  let dmgTargets = sDef.target ? getTargets(sDef.target, defaultTargetObj) : baseTargets;
                  let baseDmg = factorVal > 0 ? factorVal : (eStats.atk * 1.5);

                  for (let t of dmgTargets) {
                      if (t.ref.baseStats.hp <= 0) continue;
                      let dmgObj = calcDamage(enemy, t.ref, enemy.attackType || enemy.type || 'phys', 1.0, false, t.side === 'party', globalStorage.charTiers, globalStorage.charEquips, runState, baseDmg);
                      applyDamageToDraft(draft, t.side, t.idx, dmgObj, 'enemy', i);
                  }
              }

              if (sDef.healing) {
                  let healTargets = sDef.healing.target ? getTargets(sDef.healing.target, defaultTargetObj) : (sDef.target ? getTargets(sDef.target, defaultTargetObj) : baseTargets);
                  let healBase = sDef.healing.base || 0;

                  if (sDef.healing.factors && Array.isArray(sDef.healing.factors)) {
                      healBase += sDef.healing.factors.reduce((sum, f) => sum + (eStats[f.stat] || 0) * (f.value || 0), 0);
                  } else if (factorVal > 0 && !sDef.damage) {
                      healBase += factorVal;
                  }

                  if (healBase > 0) {
                      for (let t of healTargets) {
                          if (t.ref.baseStats.hp <= 0) continue;
                          let res = applyHeal(t.ref, healBase, t.side === 'party', globalStorage.charTiers, globalStorage.charEquips, runState, eStats);
                          let color = res.isCrit ? 'text-green-300 font-black scale-125 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'text-green-400 font-bold scale-110';
                          let badges = res.isCrit ? [{text: 'CRITICAL', color: 'text-green-300 drop-shadow-md'}] : [];
                          addPopup(t.side, t.idx, `+${res.val}`, color, {badges});
                      }
                  }
              }

              if (sDef.shieldScaling) {
                  let shieldTargets = sDef.shieldScaling.target ? getTargets(sDef.shieldScaling.target, defaultTargetObj) : (sDef.target ? getTargets(sDef.target, defaultTargetObj) : baseTargets);
                  let shieldBase = 0;
                  if (typeof sDef.shieldScaling === 'object' && sDef.shieldScaling !== null) {
                      shieldBase = sDef.shieldScaling.base || 0;
                      if (sDef.shieldScaling.factors && Array.isArray(sDef.shieldScaling.factors)) {
                          shieldBase += sDef.shieldScaling.factors.reduce((sum, f) => sum + (eStats[f.stat] || 0) * (f.value || 0), 0);
                      } else if (factorVal > 0 && !sDef.damage && !sDef.healing) {
                          shieldBase += factorVal;
                      }
                  } else if (typeof sDef.shieldScaling === 'number') {
                      shieldBase = sDef.shieldScaling;
                  } else {
                      shieldBase = factorVal > 0 ? factorVal : 100;
                  }

                  if (shieldBase > 0) {
                      for (let t of shieldTargets) {
                          if (t.ref.baseStats.hp <= 0) continue;
                          t.ref.baseStats.permShield = (t.ref.baseStats.permShield || 0) + Math.floor(shieldBase);
                          t.ref.baseStats.shield = (t.ref.baseStats.permShield || 0) + (t.ref.baseStats.tempShields || []).reduce((sum, ts) => sum + ts.amt, 0);
                          addPopup(t.side, t.idx, `護盾 +${Math.floor(shieldBase)}`, 'text-white font-bold scale-110 drop-shadow-md', { delay: 100 });
                      }
                  }
              }

              if (sDef.epRestore) {
                  let epTargets = sDef.epRestore.target ? getTargets(sDef.epRestore.target, defaultTargetObj) : (sDef.target ? getTargets(sDef.target, defaultTargetObj) : baseTargets);
                  let epBase = 0;
                  if (typeof sDef.epRestore === 'object' && sDef.epRestore !== null) {
                      epBase = sDef.epRestore.base || 0;
                      if (sDef.epRestore.factors && Array.isArray(sDef.epRestore.factors)) {
                          epBase += sDef.epRestore.factors.reduce((sum, f) => sum + (eStats[f.stat] || 0) * (f.value || 0), 0);
                      } else if (factorVal > 0 && !sDef.damage && !sDef.healing) {
                          epBase += factorVal;
                      }
                  } else if (typeof sDef.epRestore === 'number') {
                      epBase = sDef.epRestore;
                  } else {
                      epBase = factorVal > 0 ? factorVal : 10;
                  }

                  if (epBase > 0) {
                      for (let t of epTargets) {
                          if (t.ref.baseStats.hp <= 0) continue;
                          t.ref.energy = Math.min(100, (t.ref.energy || 0) + Math.floor(epBase));
                          addPopup(t.side, t.idx, `+${Math.floor(epBase)} EP`, 'text-yellow-400 font-bold drop-shadow-md', { delay: 150 });
                      }
                  }
              }

              const applyBuffArray = (buffArr, isDebuffFlag) => {
                  if (!buffArr || !Array.isArray(buffArr)) return;
                  for (let b of buffArr) {
                      let buffTargets = b.target ? getTargets(b.target, defaultTargetObj) : baseTargets;
                      let casterStatsSnapshot = getStats(enemy, false, globalStorage.charTiers, {}, runState);
                      for (let t of buffTargets) {
                          if (t.ref.baseStats.hp <= 0) continue;
                          addBuffToEntity(t.ref, { ...b, casterId: enemy.id, casterSide: 'enemy', casterStats: casterStatsSnapshot });
                          addPopup(t.side, t.idx, b.type, '', {isBuff: true, isDebuff: isDebuffFlag, delay: 0});
                      }
                  }
              };

              applyBuffArray(sDef.applyBuffs, false);
              applyBuffArray(sDef.applyDebuffs, true);

              enemy.energy = Math.min(100, (enemy.energy || 0) + randRange(5, 10)); 
              if (realTargetRef) realTargetRef.energy = Math.min(100, (realTargetRef.energy || 0) + randRange(5, 10));
              
              await updateAndWait(300); setFlashUnit(null); await sleep(200); 
          } else {
              setFlashUnit({ side: 'enemy', idx: i });
              if (a > 0) addPopup('enemy', i, a === 1 ? 'DA!' : 'TA!', 'text-red-400 font-bold', { offsetY: -30 });
              
              let { dmg, isCrit, eleMsg, element } = calcDamage(enemy, realTargetRef, enemy.attackType || enemy.type || 'phys', 1.0, false, true, globalStorage.charTiers, globalStorage.charEquips, runState);
              applyDamageToDraft(draft, 'party', target.originalIdx, {dmg, isCrit, eleMsg, element}, 'enemy', i);
              
              enemy.energy = Math.min(100, (enemy.energy || 0) + randRange(2, 6)); 
              if(realTargetRef) realTargetRef.energy = Math.min(100, (realTargetRef.energy || 0) + randRange(2, 6)); 
              
              await updateAndWait(150); setFlashUnit(null); await sleep(200); 
          }
      }
    }

    if (draft.party.every(p => p.baseStats.hp <= 0)) { setBattleState(draft); await sleep(1000); setScreen('gameover'); return; }

    const processBuffs = (entity, side, idx, isPlayer, draftState) => {
      let stats = getStats(entity, isPlayer, globalStorage.charTiers, globalStorage.charEquips, runState);
      let regenVal = 0; 
      let regenCasterStats = null;
      let burnVal = 0;

      // 處理限時護盾遞減
      if (entity.baseStats.tempShields && entity.baseStats.tempShields.length > 0) {
          let initialCount = entity.baseStats.tempShields.length;
          entity.baseStats.tempShields = entity.baseStats.tempShields.map(ts => ({...ts, duration: ts.duration - 1}))
                                                               .filter(ts => ts.duration > 0);
          let droppedCount = initialCount - entity.baseStats.tempShields.length;
          entity.baseStats.shield = (entity.baseStats.permShield || 0) + entity.baseStats.tempShields.reduce((sum, ts) => sum + ts.amt, 0);
          if (droppedCount > 0) {
              addPopup(side, idx, '護盾消失', 'text-gray-400 text-xs');
          }
      }
      
      entity.buffs.forEach(b => { 
          const bDef = BUFF_DB[b.type] || {};
          // 決定公式計算所參照的體質
          let refStats = stats; // 預設使用宿主自身體質

          // 如果是屬於需要施法者體質的技能 (如 regen, burn, 或帶有 dot 的狀態)，且存有當初的快照，則優先使用快照體質
          if (CASTER_SCALING_BUFFS.includes(b.type) || bDef.dot) {
              if (b.casterStats) {
                  refStats = b.casterStats;
              } else if (b.casterId && b.casterSide && draftState[b.casterSide]) {
                  // Fallback: 如果沒有快照，才嘗試動態抓取目前的施法者體質
                  let casterEntity = draftState[b.casterSide].find(c => c && c.id === b.casterId);
                  if (casterEntity) {
                      refStats = getStats(casterEntity, b.casterSide === 'party', globalStorage.charTiers, globalStorage.charEquips, runState);
                  }
              }
          }

          if (b.type === 'regen') { 
              regenVal += refStats.matk * 0.3; 
              regenCasterStats = refStats;
          }
          if (b.type === 'burn') { 
              burnVal += 200 * b.stacks; 
          }
          if (b.type === 'tide') {
              b.stacks = Math.min(3, (b.stacks || 1) + 1);
          }
          
          // 動態結算 JSON 定義的 DOT 持續傷害 (如 frostburn 凍傷)
          if (bDef.dot && (bDef.dot.type === 'mag_damage' || bDef.dot.type === 'phys_damage' || bDef.dot.type === 'damage')) {
              let formula = bDef.dot.formula || '';
              let evalFormula = formula
                  .replace(/\bmAtk\b/gi, refStats.mAtk || refStats.matk || 0)
                  .replace(/\bpAtk\b/gi, refStats.pAtk || refStats.atk || 0)
                  .replace(/\bmDef\b/gi, refStats.mDef || refStats.mdef || 0)
                  .replace(/\bpDef\b/gi, refStats.pDef || refStats.pdef || 0)
                  .replace(/\bmaxHp\b/gi, refStats.maxHp || 0)
                  .replace(/\bstacks\b/gi, b.stacks || 1);
                  
              let dmgVal = 0;
              try { dmgVal = Math.floor(new Function('return ' + evalFormula)()); } catch (e) { console.warn("DOT eval error", e); }
              
              if (dmgVal > 0 && entity.baseStats.hp > 0) {
                  entity.baseStats.hp -= dmgVal;
                  addHitFlash(side, idx);
                  addPopup(side, idx, dmgVal.toString(), `${bDef.color || 'text-red-500'} font-black scale-125 drop-shadow-md`);
              }
          }
      });
      
      if (regenVal > 0 && entity.baseStats.hp > 0) { 
          let res = applyHeal(entity, regenVal, isPlayer, globalStorage.charTiers, globalStorage.charEquips, runState, regenCasterStats || stats); 
          addPopup(side, idx, `+${res.val}`, 'text-green-400 font-bold scale-110'); 
      }
      if (burnVal > 0 && entity.baseStats.hp > 0) { 
          entity.baseStats.hp -= burnVal; 
          addPopup(side, idx, burnVal.toString(), 'text-orange-500 font-black scale-125'); 
      }
      
      entity.buffs = entity.buffs.map(b => {
         const bDef = BUFF_DB[b.type]; if (!bDef) return b;
         if ((bDef.mech === 'duration' || bDef.mech === 'stack_duration') && b.duration !== 99 && b.duration !== 999) return { ...b, duration: b.duration - 1 };
         return b;
      }).filter(b => {
         const bDef = BUFF_DB[b.type]; if (!bDef) return false;
         if (bDef.mech === 'duration') return b.duration > 0 || b.duration === 99 || b.duration === 999;
         if (bDef.mech === 'stack_duration') return (b.duration > 0 || b.duration === 99 || b.duration === 999) && b.stacks > 0;
         if (bDef.mech === 'stack') return b.stacks > 0;
         return true;
      });
    };

    draft.party.forEach((p, i) => processBuffs(p, 'party', i, true, draft)); 
    draft.enemies.forEach((e, i) => processBuffs(e, 'enemy', i, false, draft));
    
    draft.enemies.forEach(e => {
        if (e.skillCooldowns) {
            Object.keys(e.skillCooldowns).forEach(k => {
                if (e.skillCooldowns[k] > 0) e.skillCooldowns[k] -= 1;
            });
        }
    });

    setSkillCooldowns(prev => { let nextCd = {}; Object.keys(prev).forEach(k => { if (prev[k] > 0) nextCd[k] = prev[k] - 1; }); return nextCd; });
    setUltToggled([false, false, false, false]); 
    checkMaxStacksTriggers(draft); // 新增回合結束時疊層上限檢查
    setBattleState(draft); 
    setBattlePhase('idle');
  };

  const handleBattleEnd = (draft) => {
    setGlobalTooltip(null);
    
    const isBossNode = currentNodeInfo?.type === 'boss';
    let updatedEpBoosts = { ...runState.epBoosts };
    let bossEpTextLog = [];
    let bossTierUpgradeTextLog = [];
    let updatedTiers = { ...globalStorage.charTiers };
    
    let updatedParty = draft.party.map(p => {
       let nextEp = p.energy;
       if (isBossNode && floor < 3 && nextEp > 0) {
           const boost = nextEp * 0.005; // 1 EP = 0.5%
           const currentBoost = updatedEpBoosts[p.id] || 1.0;
           updatedEpBoosts[p.id] = currentBoost + boost;
           bossEpTextLog.push({
               id: p.id,
               name: getCharDisplayName(p, globalStorage.charTiers, globalStorage.churchUpgrades),
               ep: nextEp,
               boostPct: (boost * 100).toFixed(1)
           });
           nextEp = 0; // 清空該成員的 EP
       }
       return { ...p, energy: nextEp, buffs: [], baseStats: { ...p.baseStats, shield: 0, permShield: 0, tempShields: [] } };
    });
    
    if (isBossNode) {
       // 處理自動階級提升 (全層數適用)
       draft.party.forEach(p => {
           if (p) {
               const currentTier = updatedTiers[p.id] || 0;
               if (currentTier < 5) { // 若未達神話階級(5)則提升一階
                   updatedTiers[p.id] = currentTier + 1;
                   bossTierUpgradeTextLog.push({
                       id: p.id,
                       name: p.name,
                       oldTierName: RARITY_MAP[RARITY_ORDER[currentTier]].name,
                       newTierName: RARITY_MAP[RARITY_ORDER[currentTier + 1]].name,
                       color: RARITY_MAP[RARITY_ORDER[currentTier + 1]].color
                   });
               }
           }
       });

       if (floor < 3) {
           setRunState(prev => ({ ...prev, epBoosts: updatedEpBoosts }));
           setBossEpLog(bossEpTextLog); // 將數據結構化保存入 state 渲染，不再彈出 prompt
       } else {
           setBossEpLog([]);
       }
       
       setBossTierUpgradeLog(bossTierUpgradeTextLog);
       // 立即更新階級到全局 (這樣回城或結算才不會遺失)
       setGlobalStorage(prev => ({ ...prev, charTiers: updatedTiers }));
    } else {
       setBossEpLog([]);
       setBossTierUpgradeLog([]);
    }
    
    setPartySlots(updatedParty);
    let lootList = [];
    let droppedGold = randRange(30, 80) + (currentNodeInfo?.type==='elite'?100:0) + (currentNodeInfo?.type==='boss'?300:0);
    lootList.push({ id: 'l_gold', type: 'gold', name: `金幣 x${droppedGold}`, val: droppedGold, selected: true });
    let droppedFlowers = randRange(2, 10);
    lootList.push({ id: 'l_flower', type: 'flower', name: `祈願花 x${droppedFlowers}`, val: droppedFlowers, selected: true });

    if(currentNodeInfo?.type === 'boss' || currentNodeInfo?.type === 'elite') {
       let dropRarity = floor === 1 ? (currentNodeInfo.type === 'boss' ? 'legendary' : (Math.random() < 0.3 ? 'legendary' : 'rare')) : floor === 2 ? (currentNodeInfo.type === 'boss' ? 'epic' : (Math.random() < 0.3 ? 'epic' : 'legendary')) : (currentNodeInfo.type === 'boss' ? 'mythic' : (Math.random() < 0.3 ? 'mythic' : 'epic'));
       let newEq = generateEquip(floor, equipRecipes, dropRarity);
       lootList.push({ id: `l_eq_${newEq.id}`, type: 'equip', name: newEq.name, data: newEq, rarity: newEq.rarity, selected: true });
       if (currentNodeInfo.type === 'boss') {
           let secondRarity = RARITY_ORDER[Math.max(0, RARITY_ORDER.indexOf(dropRarity) - 1)]; let newEq2 = generateEquip(floor, equipRecipes, secondRarity);
           lootList.push({ id: `l_eq_${newEq2.id}`, type: 'equip', name: newEq2.name, data: newEq2, rarity: newEq2.rarity, selected: true });
       }
    }

    let matDropsMap = {};
    draft.enemies.forEach((e, idx) => { 
        if(e.drops) {
            e.drops.forEach((d, dIdx) => { 
                matDropsMap[d.name] = (matDropsMap[d.name] || 0) + d.val;
            }); 
        }
    });

    Object.entries(matDropsMap).forEach(([matName, totalQty], mIdx) => {
        lootList.push({ id: `l_mat_${mIdx}`, type: 'mat', name: `${matName} x${totalQty}`, data: { name: matName, val: totalQty }, selected: true });
    });

    if (currentNodeInfo?.type === 'boss') {
        let uStones = floor === 1 ? 1 : floor === 2 ? 1 : 3;
        lootList.push({ id: 'l_upg_stone', type: 'upgStone', name: `升階石 x${uStones}`, val: uStones, selected: true });
        
        if (floor >= 3) {
            lootList.push({ id: 'l_evo_stone', type: 'evoStone', name: `進化石 x1`, val: 1, selected: true });
        }
        
        let colosStonesQty = floor >= 3 ? 20 : 10;
        const colosName = materialDb['mat072']?.name || '珂蘿絲石';
        lootList.push({ id: `l_colos_stone`, type: 'colosStone', name: `${colosName} x${colosStonesQty}`, data: { name: colosName, val: colosStonesQty }, val: colosStonesQty, selected: true });
    }

    lootList.sort((a, b) => {
        const typeOrder = { 'gold': 0, 'flower': 1, 'upgStone': 2, 'evoStone': 3, 'colosStone': 4, 'equip': 5, 'mat': 6 };
        if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
        let rA = a.rarity ? RARITY_ORDER.indexOf(a.rarity) : (a.data?.name ? RARITY_ORDER.indexOf(getMatData(a.data.name).rarity) : -1);
        let rB = b.rarity ? RARITY_ORDER.indexOf(b.rarity) : (b.data?.name ? RARITY_ORDER.indexOf(getMatData(b.data.name).rarity) : -1);
        return rB - rA;
    });
    setPostBattleLoot(lootList); setScreen('loot');
  };

  const renderTitle = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white overflow-hidden p-4">
      <Sword size={64} className="mb-6 text-yellow-500" />
      <h1 className="text-5xl font-bold mb-4 tracking-wider text-center">異界之塔：宿命戰線</h1>
      <p className="text-gray-400 mb-8 text-center max-w-md">深淵的多層考驗。經營隊伍、合成裝備，達到最終階級解放真名。</p>
      
      <div className="flex items-center gap-4 mb-8 bg-gray-900 border border-gray-850 px-5 py-3 rounded-2xl shadow-xl">
        <span className="text-sm font-bold text-gray-300 flex items-center gap-2">
          <Sparkles size={16} className="text-yellow-400 animate-pulse"/>
          遊戲開發測試模式
        </span>
        <button 
           onClick={() => setDevMode(!devMode)}
           className={`w-16 h-8 rounded-full transition-all duration-300 relative flex items-center px-1 border border-gray-750/30 ${devMode ? 'bg-green-600 shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 'bg-gray-800'}`}
        >
           <span className={`absolute bg-white w-6 h-6 rounded-full shadow-md transition-all duration-300 ${devMode ? 'left-9' : 'left-1'}`} />
           <span className={`text-[10px] font-black absolute ${devMode ? 'left-2.5 text-white' : 'right-2.5 text-gray-500'}`}>
              {devMode ? 'ON' : 'OFF'}
           </span>
        </button>
      </div>

      <button onClick={() => { 
          if (devMode) {
              applyDevModeCheats();
          }
          setPrevScreen('town'); 
          setScreen('town'); 
      }} className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-xl font-bold shadow-[0_0_20px_rgba(202,138,4,0.4)] transition-all">進入城鎮</button>
    </div>
  );

  const goldName = materialDb['mat100']?.name || '金幣';
  const GoldIcon = ({ size = 20, className = '' }) => {
      const imgUrl = materialDb['mat100']?.imageUrl;
      if (imgUrl) return <img src={imgUrl} className={`object-contain inline-block ${className}`} style={{ width: size, height: size }} alt={goldName} />;
      return <Coins size={size} className={`inline-block ${className}`} />;
  };

  const renderTown = () => {
    const TOWN_LOCATIONS = [
       { id: 'assembly', name: '集會所', desc: '編組隊伍與出發', icon: Tent, color: 'blue', img: 'https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MAP/mainscene_guildhall.jpg', onClick: () => setScreen('assembly') },
       { id: 'synthesis', name: '鐵匠鋪', desc: '裝備合成與配裝', icon: Hammer, color: 'orange', img: 'https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MAP/mainscene_blacksmith.jpg', onClick: () => {setSynthesisTab('craft'); setEqFilter('all'); setSelectedEq(null); setDismantleSelections([]); setPrevScreen('town'); setScreen('synthesis');} },
       { id: 'guild', name: '公會', desc: '認證與角色突破', icon: Users, color: 'purple', img: 'https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MAP/mainscene_guild.jpg', onClick: () => setScreen('guild') },
       { id: 'church', name: '教堂', desc: '祈福與恩賜', icon: BookHeart, color: 'pink', img: 'https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MAP/mainscene_church.jpg', onClick: () => {setChurchFilters({ skill: true, unlocked: false }); setScreen('church');} },
       { id: 'market', name: '市集', desc: '購買特殊刻印與素材', icon: Store, color: 'green', img: 'https://cdn.jsdelivr.net/gh/seraphimjoker/my-game-assets-test-images@main/MAP/mainscene_market.jpg', onClick: () => {setPrevScreen('town'); setScreen('market');} }
    ];

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-950 text-white relative items-center justify-center p-6">
          <div className="absolute top-6 right-6 bg-gray-900 border border-gray-700 px-6 py-2 rounded-full flex items-center gap-2 font-bold text-yellow-400 shadow-md z-20">
             <GoldIcon size={20}/> {goldName}: {globalStorage.townGold || 0}
          </div>
          <h2 className="text-5xl font-black mb-12 text-yellow-500 tracking-widest drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] z-20">邊境城鎮</h2>
          
          <div className="flex flex-wrap justify-center gap-8 max-w-[760px] w-full z-20">
            {TOWN_LOCATIONS.map(loc => {
                const cMap = {
                    'blue': 'hover:border-blue-500 text-blue-500 group-hover:text-blue-400',
                    'orange': 'hover:border-orange-500 text-orange-500 group-hover:text-orange-400',
                    'purple': 'hover:border-purple-500 text-purple-500 group-hover:text-purple-400',
                    'pink': 'hover:border-pink-500 text-pink-500 group-hover:text-pink-400',
                    'green': 'hover:border-green-500 text-green-500 group-hover:text-green-400'
                };
                const colorClass = cMap[loc.color];
                return (
                    <button key={loc.id} onClick={loc.onClick} className={`relative h-72 w-52 border-2 border-gray-700 bg-gray-900 rounded-3xl overflow-hidden flex flex-col items-center justify-end pb-8 transition-all duration-300 hover:-translate-y-3 shadow-2xl group ${colorClass.split(' ')[0]}`}>
                        <img src={getImgUrl(loc.img)} draggable={false} onDragStart={(e)=>e.preventDefault()} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500 select-none" alt={loc.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/50 to-transparent pointer-events-none transition-opacity duration-500 group-hover:opacity-70"></div>
                        <div className="relative z-10 flex flex-col items-center transition-transform duration-300 group-hover:-translate-y-2">
                            <span className="text-3xl font-black mb-2 text-white drop-shadow-[0_4px_4px_rgba(0,0,0,1)] tracking-widest">{loc.name}</span>
                            <span className="text-gray-300 text-xs font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,1)] bg-gray-900/80 px-3 py-1 rounded-full border border-gray-700/80">{loc.desc}</span>
                        </div>
                    </button>
                )
            })}
          </div>
        </div>
    );
  };

  const renderMarket = () => {
      const MARKET_ITEMS = ['陽炎刻印', '滄海刻印', '碧翠刻印', '荒野刻印', '天光刻印', '深影刻印'];
      const STONE_PRICES = { common: 20, uncommon: 40, rare: 60, legendary: 80, epic: 100, mythic: 120 };

      return (
          <div className="flex flex-col h-screen overflow-hidden bg-gray-950 text-white p-6 relative">
              <button onClick={() => setScreen('town')} className="absolute top-6 left-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 font-bold"><Home size={18}/>返回城鎮</button>
              <div className="absolute top-6 right-6 bg-gray-900 border border-gray-700 px-6 py-2 rounded-full flex items-center gap-2 font-bold text-yellow-400 shadow-md">
                  <GoldIcon size={20}/> {goldName}: {globalStorage.townGold || 0}
              </div>
              <div className="flex justify-center items-center gap-4 mb-4 mt-2"><Store size={40} className="text-green-500"/><h2 className="text-4xl font-bold">市集</h2></div>
              
              <div className="flex justify-center gap-4 mb-6">
                  <button onClick={() => setMarketTab('sigil')} className={`px-6 py-2 rounded-full font-bold transition-all ${marketTab === 'sigil' ? 'bg-green-600 text-white shadow-md shadow-green-600/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>特殊刻印</button>
                  <button onClick={() => setMarketTab('stone')} className={`px-6 py-2 rounded-full font-bold transition-all ${marketTab === 'stone' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>裝備強化石</button>
              </div>

              <div className="max-w-4xl mx-auto w-full grid grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto pb-8 scrollbar-hide">
                  {marketTab === 'sigil' && MARKET_ITEMS.map(mat => (
                      <div key={mat} className="bg-gray-900 border-2 border-gray-700 hover:border-green-500/50 rounded-xl p-3 flex flex-col items-center justify-center transition-all shadow-md hover:-translate-y-1">
                          {getMatImg(mat) ? <img src={getMatImg(mat)} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-12 h-12 object-contain mb-2 drop-shadow-md" alt={mat}/> : <div className="w-12 h-12 mb-2 text-2xl flex items-center justify-center">✨</div>}
                          <div className={`font-bold text-sm mb-3 ${RARITY_MAP['legendary'].color}`}>{mat}</div>
                          <button onClick={() => setMarketBuyModal({ type: 'sigil', key: mat, name: mat, price: 400, qty: 1 })} disabled={(globalStorage.townGold || 0) < 400} className="w-full py-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.02] shadow-sm text-xs">
                              購買 400 <GoldIcon size={12}/>
                          </button>
                      </div>
                  ))}
                  {marketTab === 'stone' && RARITY_ORDER.map(r => {
                      const matName = RARITY_MAP[r].name + '強化石';
                      const price = STONE_PRICES[r];
                      return (
                          <div key={`market-stone-${r}`} className="bg-gray-900 border-2 border-gray-700 hover:border-blue-500/50 rounded-xl p-3 flex flex-col items-center justify-center transition-all shadow-md hover:-translate-y-1">
                              {getMatImg(matName) ? <img src={getMatImg(matName)} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-12 h-12 object-contain mb-2 drop-shadow-md" alt={matName}/> : <div className="w-12 h-12 mb-2 text-2xl flex items-center justify-center">✨</div>}
                              <div className={`font-bold text-sm mb-3 ${RARITY_MAP[r].color}`}>{matName}</div>
                              <button onClick={() => setMarketBuyModal({ type: 'stone', key: r, name: matName, price: price, qty: 1 })} disabled={(globalStorage.townGold || 0) < price} className="w-full py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.02] shadow-sm text-xs">
                                  購買 {price} <GoldIcon size={12}/>
                              </button>
                          </div>
                      )
                  })}
              </div>
              
              {marketBuyModal && (
                  <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setMarketBuyModal(null)}>
                     <div className="bg-gray-800 border-2 border-green-500 rounded-xl p-6 max-w-sm w-full text-center shadow-[0_0_30px_rgba(34,197,94,0.3)] relative" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold mb-4 text-white">批量購買 {marketBuyModal.name}</h3>
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <button onClick={() => setMarketBuyModal(p => ({...p, qty: Math.max(1, p.qty - 1)}))} className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-xl">-</button>
                            <div className="text-3xl font-black w-16">{marketBuyModal.qty}</div>
                            <button onClick={() => setMarketBuyModal(p => ({...p, qty: Math.min(20, p.qty + 1)}))} className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-xl">+</button>
                        </div>
                        <div className="text-gray-300 mb-6">總價: <span className="text-yellow-400 font-bold">{marketBuyModal.price * marketBuyModal.qty} <GoldIcon size={14} className="inline-block"/></span></div>
                        <div className="flex gap-4">
                            <button onClick={() => setMarketBuyModal(null)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-white">取消</button>
                            <button onClick={() => {
                                const totalCost = marketBuyModal.price * marketBuyModal.qty;
                                if ((globalStorage.townGold || 0) < totalCost) return showDialog('資金不足', '城鎮資金不足以購買這些數量。');
                                
                                setGlobalStorage(prev => {
                                    const next = { ...prev, townGold: prev.townGold - totalCost };
                                    if (marketBuyModal.type === 'sigil') {
                                        next.materials = { ...prev.materials, [marketBuyModal.key]: (prev.materials[marketBuyModal.key] || 0) + marketBuyModal.qty };
                                    } else {
                                        next.refineStones = { ...prev.refineStones, [marketBuyModal.key]: (prev.refineStones[marketBuyModal.key] || 0) + marketBuyModal.qty };
                                    }
                                    return next;
                                });
                                showDialog('購買成功', `成功購買了 ${marketBuyModal.qty} 個 ${marketBuyModal.name}！`, 'alert');
                                setMarketBuyModal(null);
                            }} disabled={(globalStorage.townGold || 0) < marketBuyModal.price * marketBuyModal.qty} className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-bold text-white transition-all">確認購買</button>
                        </div>
                     </div>
                  </div>
              )}
          </div>
      );
  };

  const renderGuild = () => {
     const handleUpgradeTier = (char) => {
         if (globalStorage.evolutionStones < 1) return showDialog('進化石不足', '您沒有足夠的進化石來提升該角色階級。');
         let t = globalStorage.charTiers[char.id] || 0;
         if (t >= 5) return showDialog('無法突破', '角色已達到最高階級！');
         showDialog('突破潛能', `確定要消耗 1 顆進化石提升 ${char.name} 的階級嗎？`, 'confirm', () => {
             setGlobalStorage(prev => ({ ...prev, evolutionStones: prev.evolutionStones - 1, charTiers: { ...prev.charTiers, [char.id]: t + 1 } }));
             setTimeout(() => showDialog('突破成功', `${char.name} 成功突破潛能，提升為更高階級！`, 'alert'), 100);
         });
     };
     return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-900 text-white p-6 relative">
          <button onClick={() => setScreen('town')} className="absolute top-6 left-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 font-bold"><Home size={18}/>返回城鎮</button>
          
          {guildTab === 'potential' && (
              <div className="absolute top-6 right-6 bg-gray-800 px-5 py-2 rounded-full flex items-center gap-2 font-bold text-purple-300 border border-gray-700 shadow-lg text-sm">
                  {getMatImg('進化石') ? <img src={getMatImg('進化石')} className="w-5 h-5 object-contain" alt=""/> : <Sparkles size={18}/>} 進化石: {globalStorage.evolutionStones}
              </div>
          )}
          
          <div className="flex justify-center items-center gap-4 mb-6">
              <Users size={40} className="text-purple-400"/>
              <h2 className="text-4xl font-bold">冒險者公會</h2>
          </div>

          <div className="flex justify-center gap-4 mb-6">
              <button onClick={() => setGuildTab('potential')} className={`px-8 py-2 rounded-full font-bold transition-all ${guildTab === 'potential' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>潛能解放</button>
              <button onClick={() => setGuildTab('refine')} className={`px-8 py-2 rounded-full font-bold transition-all ${guildTab === 'refine' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>精煉解放</button>
          </div>

          {guildTab === 'potential' ? (
              <>
                  <div className="max-w-4xl mx-auto w-full text-center mb-8"><p className="text-gray-400">消耗<span className="text-purple-400 font-bold mx-1">進化石</span>來提升角色的潛能階級。達到最高級即可解放真名認證。</p></div>
                  <div className="max-w-5xl mx-auto w-full flex-1 overflow-y-auto px-6 scrollbar-hide">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-6">
                          {charPool.map(char => {
                              const tier = globalStorage.charTiers[char.id] || 0; const tierColor = RARITY_MAP[RARITY_ORDER[tier]].color;
                              return (
                                  <div key={`guild-char-${char.id}`} className={`bg-gray-800 border border-gray-700 rounded-xl flex shadow-lg overflow-hidden h-24 transition-all ${char.locked ? 'opacity-50 grayscale' : 'hover:border-purple-500/50'}`}>
                                      <div className="w-20 relative bg-gray-900 flex-shrink-0 border-r border-gray-700 flex items-center justify-center">
                                          {char.locked ? <Lock size={20} className="text-gray-500 mb-1"/> : (
                                              <>
                                                  {getActiveCharImg(char) ? <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getActiveCharImg(char)} className="absolute inset-0 w-full h-full object-cover object-top opacity-90" alt={char.name} /> : <div className="w-full h-full flex items-center justify-center"><span className={`text-4xl opacity-30 ${ELEMENT_COLORS[char.element]}`}>{ROLE_ICONS[char.role]}</span></div>}
                                                  <div className="absolute bottom-1 left-1 z-10"><img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getRoleIconUrl(char.role, char.element)} className="w-4 h-4 object-contain" alt="" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='block';}}/><span style={{display:'none'}} className={`text-lg ${ELEMENT_COLORS[char.element]}`}>{ROLE_ICONS[char.role]}</span></div>
                                                  {typeof char.seriesexhibit === 'string' && char.seriesexhibit && <div className="absolute bottom-1 right-1 z-10 text-[10px] bg-indigo-900/80 text-indigo-200 px-1 rounded shadow-sm font-bold tracking-widest border border-indigo-700">{TXT(char.seriesexhibit)}</div>}
                                              </>
                                          )}
                                      </div>
                                      <div className="flex-1 p-2.5 flex flex-col justify-between min-w-0">
                                          {char.locked ? <div className="flex-1 flex items-center justify-center"><div className="text-gray-400 font-bold text-xs">尚未開放</div></div> : (
                                              <>
                                                 <div className="min-w-0 text-center">
                                                     {tier >= 5 ? (
                                                         <div className="leading-tight mb-0.5">
                                                             <div className={`text-[10px] truncate opacity-80 ${tierColor}`}>{TXT(char.title)}</div>
                                                             <div className={`text-sm font-bold truncate ${tierColor}`}>{TXT(char.name)}{(globalStorage.churchUpgrades || []).some(u => getChurchUpgrades().find(c => c.id === u)?.charId === char.id) ? ' ✿' : ''}</div>
                                                         </div>
                                                     ) : (
                                                         <div className={`text-base font-bold truncate ${tierColor}`}>{TXT(char.name)}{(globalStorage.churchUpgrades || []).some(u => getChurchUpgrades().find(c => c.id === u)?.charId === char.id) ? ' ✿' : ''}</div>
                                                     )}
                                                     <div className="text-gray-400 text-[10px] mt-0.5">階級: <span className={`font-bold ${tierColor}`}>{RARITY_MAP[RARITY_ORDER[tier]].name}</span></div>
                                                 </div>
                                                 <div className="flex justify-center mt-1">
                                                     <button onClick={() => handleUpgradeTier(char)} disabled={tier >= 5 || globalStorage.evolutionStones < 1} className="px-3 py-1 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-transform hover:scale-105 shadow-md">
                                                         {tier >= 5 ? '已達最終' : <><ArrowUpCircle size={12}/> 突破潛能</>}
                                                     </button>
                                                 </div>
                                              </>
                                          )}
                                      </div>
                                  </div>
                              )
                          })}
                      </div>
                  </div>
              </>
          ) : (
              <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-gray-500 pb-20">
                  <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-700">
                      <Hammer size={48} className="text-gray-600"/>
                  </div>
                  <h3 className="text-3xl font-bold mb-4 text-purple-400/50 tracking-widest">精煉解放</h3>
                  <p className="text-center max-w-md text-gray-400 leading-relaxed bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 shadow-sm">
                      系統開發中...<br/><br/>
                      未來將開放透過消耗特定<span className="text-purple-300 font-bold">素材</span>與<span className="text-green-400 font-bold">刻印</span>，<br/>在此兌換並解放角色的專屬精煉裝備。
                  </p>
              </div>
          )}
        </div>
     );
  };

  const renderChurch = () => {
      const getFullUpgradeName = (upg) => {
          const baseSkillId = upg.id.replace('ex', '');
          const baseSkillName = SKILL_DB[baseSkillId]?.name || '';
          const upgName = upg.name.replace(/【.*?】升級：/, '').replace('升級：', '');
          return baseSkillName ? `${baseSkillName}【升級】${upgName}` : `【升級】${upgName}`;
      };

      const handleUnlockChurch = (upg) => {
          if (globalStorage.wishFlowers < upg.cost) return showDialog('祈願花不足', `需要 ${upg.cost} 朵祈願花才能解鎖此能力。`);
          if ((globalStorage.churchUpgrades || []).includes(upg.id)) return showDialog('已解鎖', '此能力已經解鎖過了。');
          const tier = globalStorage.charTiers[upg.charId] || 0;
          if (tier < 4) return showDialog('潛能不足', `該角色需達到史詩階級 (目前為 ${RARITY_MAP[RARITY_ORDER[tier]].name}) 才能解鎖此能力！`);
          
          const fName = getFullUpgradeName(upg);
          
          showDialog('確認解鎖', `確定要消耗 ${upg.cost} 朵祈願花解鎖 ${fName} 嗎？`, 'confirm', () => {
              setGlobalStorage(prev => ({ ...prev, wishFlowers: prev.wishFlowers - upg.cost, churchUpgrades: [...(prev.churchUpgrades || []), upg.id] }));
              setTimeout(() => showDialog('解鎖成功', `成功解鎖 ${fName}！`, 'alert'), 100);
          });
      };

      const renderUpgCard = (upg) => {
          const char = charPool.find(c => c.id === upg.charId); if (!char) return null;
          const tier = globalStorage.charTiers[upg.charId] || 0;
          const isUnlocked = (globalStorage.churchUpgrades || []).includes(upg.id);
          const disabled = isUnlocked || tier < 4 || globalStorage.wishFlowers < upg.cost;
          let fName = getFullUpgradeName(upg);

          return (
              <div key={`church-upg-${upg.id}`} className={`bg-gray-800 border border-gray-700 rounded-xl flex shadow-md transition-all overflow-hidden h-40 ${isUnlocked ? 'border-pink-500/30 bg-gray-800/60' : 'hover:border-pink-500'}`}>
                  <div className="w-28 relative bg-gray-900 flex-shrink-0 border-r border-gray-700 cursor-help" onContextMenu={(e) => { e.preventDefault(); setDetailItemModal({type: 'all_skills', char: char}); }}>
                      {getActiveCharImg(char) ? <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getActiveCharImg(char)} className="w-full h-full object-cover object-top opacity-90" alt={char.name} /> : <div className="w-full h-full flex items-center justify-center"><span className={`text-5xl opacity-40 ${ELEMENT_COLORS[char.element]}`}>{ROLE_ICONS[char.role]}</span></div>}
                      <div className="absolute bottom-2 left-2 z-10"><img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getRoleIconUrl(char.role, char.element)} className="w-6 h-6 object-contain drop-shadow-md" alt="" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='block';}}/><span style={{display:'none'}} className={`text-xl ${ELEMENT_COLORS[char.element]}`}>{ROLE_ICONS[char.role]}</span></div>
                  </div>
                  <div className="flex-1 p-4 flex flex-col relative min-w-0">
                      <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col min-w-0 pr-4">
                              <div className="font-bold text-base text-white truncate mb-2">{TXT(char.name)} <span className="text-xs text-gray-500">({RARITY_MAP[RARITY_ORDER[tier]].name})</span></div>
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg border-2 border-gray-700 bg-gray-900 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                                      <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getSkillIconUrl(upg.id)} className="w-full h-full object-cover" alt="" onError={(e)=>e.target.style.display='none'} />
                                  </div>
                                  <div className={`text-xs font-bold whitespace-nowrap ${isUnlocked ? 'text-pink-300' : 'text-pink-500'}`}>{fName}</div>
                              </div>
                          </div>
                          <button onClick={() => handleUnlockChurch(upg)} disabled={disabled} className={`py-2 px-3 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm shrink-0 whitespace-nowrap ${isUnlocked ? 'bg-gray-900 text-pink-500 border border-gray-700' : (tier < 4 || globalStorage.wishFlowers < upg.cost) ? 'bg-gray-700 text-gray-400' : 'bg-pink-700 hover:bg-pink-600 text-white transition-transform hover:-translate-y-0.5'}`}>
                              {isUnlocked ? '已獲得' : tier < 4 ? '需達史詩' : globalStorage.wishFlowers < upg.cost ? '祈願花不足' : <>祈願 {getMatImg('祈願花') ? <img src={getMatImg('祈願花')} className="w-4 h-4 object-contain" alt=""/> : <BookHeart size={12}/>} {upg.cost}</>}
                          </button>
                      </div>
                      <div className="text-xs text-gray-300 flex-1 overflow-y-auto pr-1 scrollbar-hide leading-relaxed mt-1">{renderDynamicDesc(upg.desc, getStats(char, true, globalStorage.charTiers, globalStorage.charEquips, runState))}</div>
                  </div>
              </div>
          );
      };

      const currentList = getChurchUpgrades().filter(u => churchFilters[u.type] && (!churchFilters.unlocked || (globalStorage.churchUpgrades || []).includes(u.id)) && (churchFilters.unlocked || !(globalStorage.churchUpgrades || []).includes(u.id)));

      return (
          <div className="flex flex-col h-screen overflow-hidden bg-gray-900 text-white p-6 relative items-center justify-start pt-16">
              <button onClick={() => setScreen('town')} className="absolute top-6 left-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 font-bold"><Home size={18}/>返回城鎮</button>
              <div className="absolute top-6 right-6 bg-gray-800 px-5 py-2 rounded-full flex items-center gap-2 font-bold text-pink-300 border border-gray-700 shadow-lg text-sm">{getMatImg('祈願花') ? <img src={getMatImg('祈願花')} className="w-5 h-5 object-contain" alt=""/> : <BookHeart size={18}/>} 祈願花: {globalStorage.wishFlowers}</div>
              <div className="flex flex-col items-center mb-5"><BookHeart size={48} className="mb-2 text-pink-500" /><h2 className="text-3xl font-bold mb-1 text-gray-200">聖光大教堂</h2><p className="text-xs text-gray-400 max-w-xl text-center">向神明祈禱，解鎖史詩階級以上角色的強化技能。(對頭像點擊右鍵可檢視角色所有技能)</p></div>
              <div className="flex gap-4 mb-4 justify-center">
                  <button onClick={() => setChurchFilters(prev => ({...prev, skill: !prev.skill}))} className={`px-6 py-1.5 rounded-full text-sm font-bold transition-all ${churchFilters.skill ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>升級技能</button>
                  <button onClick={() => setChurchFilters(prev => ({...prev, unlocked: !prev.unlocked}))} className={`px-6 py-1.5 rounded-full text-sm font-bold transition-all ${churchFilters.unlocked ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>已受到恩賜</button>
              </div>
              <div className="w-full max-w-5xl overflow-y-auto pb-6 px-4 flex-1 scrollbar-hide">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{currentList.map(u => renderUpgCard(u))}</div>
                  {currentList.length === 0 && <div className="text-center text-gray-500 py-10 text-sm font-bold">目前沒有任何符合篩選的項目。</div>}
              </div>
          </div>
      );
  };

  const renderSelectDungeon = () => (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-950 text-white relative items-center justify-center p-6">
      <button onClick={() => setScreen('assembly')} className="absolute top-6 left-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded flex items-center gap-2 z-10"><ArrowRight size={18} className="rotate-180"/>返回編組</button>
      <h2 className="text-4xl font-bold text-yellow-500 mb-8 z-10">選擇探索地下城</h2>
      <div className="grid grid-cols-3 gap-6 w-full max-w-5xl justify-items-center mb-4 z-10">
        {dungeonList.map(d => {
           const ICONS = { TreePine, Target, Flame, Sun, Moon, Sparkles, Mountain }; const IconCmp = ICONS[d?.iconName] || Mountain;
           const curAdv = globalStorage.unlockedDungeonLevels[d?.id] || 0;
           return (
               <div key={`dungeon-sel-${d?.id || Math.random()}`} onClick={() => setDungeonStartModal(d?.id)} className={`relative w-full max-w-xs h-64 flex flex-col items-center justify-center bg-gray-900 border-4 border-transparent hover:${d?.theme || 'border-gray-500'} rounded-2xl p-6 cursor-pointer transition-all hover:scale-105 shadow-lg group overflow-hidden`}>
                 {d?.previewUrl && <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={d.previewUrl} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity z-0" alt="" />}
                 <div className="relative z-10 flex flex-col items-center w-full">
                    <IconCmp size={40} className={`${d?.iconColor || 'text-gray-500'} mb-4`} />
                    <h3 className="text-xl font-bold mb-1 text-gray-200 group-hover:text-white drop-shadow-md">{TXT(d?.name) || '未知區域'}</h3>
                    {curAdv > 0 && <div className="text-xs font-bold text-yellow-400 bg-gray-950/80 px-2 py-0.5 rounded mb-2 shadow-sm">最高進階: {curAdv}</div>}
                    <p className="text-xs text-gray-400 text-center mb-4 h-8 drop-shadow-sm">{TXT(d?.desc) || '...'}</p>
                    <div className="text-[10px] text-gray-300 bg-gray-950/80 p-2 rounded w-full text-center truncate shadow-sm">首領: {Array.isArray(d?.bosses) ? d.bosses.map(b=>b.name).join(', ') : '未知'}</div>
                 </div>
               </div>
           );
        })}
      </div>
      {dungeonStartModal && (
         <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setDungeonStartModal(null); setSelectedAdvLevel(0); }}>
            <div className="bg-gray-800 border-2 border-yellow-500 rounded-xl p-8 max-w-md w-full text-center shadow-[0_0_30px_rgba(202,138,4,0.3)] relative" onClick={e => e.stopPropagation()}>
               <button onClick={() => { setDungeonStartModal(null); setSelectedAdvLevel(0); }} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
               <h3 className="text-2xl font-bold mb-2 text-white">選擇挑戰難度</h3>
               <p className="text-gray-400 text-sm mb-6">進階難度越高，敵人屬性越強，且休息與祈禱的效果會減弱。</p>
               <div className="flex flex-col gap-3 mb-6">
                  {[0, 1, 2, 3].map(lvl => {
                      const isUnlocked = lvl <= (globalStorage.unlockedDungeonLevels[dungeonStartModal] || 0);
                      const ADV_NAMES = ['一般難度', '異變', '崩壞', '終末'];
                      return (
                          <button key={`lvl-btn-${lvl}`} disabled={!isUnlocked} onClick={() => setSelectedAdvLevel(lvl)} className={`py-3 px-4 rounded-lg border-2 font-bold transition-all ${!isUnlocked ? 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed' : selectedAdvLevel === lvl ? 'bg-yellow-600 border-yellow-400 text-white shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-yellow-500/50'}`}>
                             {ADV_NAMES[lvl]} {!isUnlocked && <span className="text-xs ml-2">(未解鎖)</span>}
                          </button>
                      )
                  })}
               </div>
               <button onClick={() => { handleAssembleStart(dungeonStartModal, selectedAdvLevel); setDungeonStartModal(null); setSelectedAdvLevel(0); }} className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white text-xl shadow-lg transition-transform hover:scale-[1.02]">確認出發</button>
            </div>
         </div>
      )}
      {renderMiniPartyHUD('top-20')}
    </div>
  );

  const renderDetailItemModal = () => {
     if (!detailItemModal) return null;
     const { type, data, char } = detailItemModal;

     let renderedBuffs = new Set();

     const renderRelatedBuffs = (buffKeys, stats) => {
         if (!buffKeys || buffKeys.length === 0) return null;
         const validKeys = Array.from(new Set(buffKeys)).filter(k => BUFF_DB[k] && !SIMPLE_BUFFS.includes(k) && !renderedBuffs.has(k));
         if (validKeys.length === 0) return null;

         validKeys.forEach(k => renderedBuffs.add(k));

         return (
             <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                 {validKeys.map(bKey => {
                     const bDef = BUFF_DB[bKey];
                     // 掛載動態說明解析器
                     const dynamicDesc = parseDynamicDesc(bDef.desc, stats);
                     return (
                         <div key={bKey} className="bg-gray-800 border border-gray-600 p-2 rounded-lg flex items-start gap-2.5 shadow-sm">
                             <img src={getBuffIconUrl(bKey)} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-6 h-6 object-contain shrink-0" alt="" onError={(e)=>{e.target.outerHTML=`<span class="text-xl leading-none mt-0.5 ${bDef.color || 'text-white'}">✨</span>`}} />
                             <div className="min-w-0 flex-1">
                                 <div className={`font-bold text-xs ${bDef.color || 'text-white'} mb-0.5 truncate`}>{TXT(bDef.name)}</div>
                                 <div className="text-[10px] text-gray-400 leading-snug whitespace-normal">{bDef.descFn ? bDef.descFn(stats) : FMT(dynamicDesc)}</div>
                             </div>
                         </div>
                     );
                 })}
             </div>
         );
     };

     if (type === 'all_skills') {
         if (!char) return null;
         const actualSkills = getActualSkills(char, globalStorage.churchUpgrades || []);
         const ultDef = char.ult ? ULT_DB[char.ult] : null;
         const cStats = getStats(char, true, globalStorage.charTiers, globalStorage.charEquips, runState);

         return (
             <div className="fixed inset-0 z-[9999999] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDetailItemModal(null)}>
                 <div className="w-full max-w-3xl bg-gray-900 border-2 border-indigo-500/50 rounded-xl shadow-2xl font-sans text-white flex flex-col max-h-[85vh] animate-[popIn_0.2s_ease-out_forwards]" onClick={e => e.stopPropagation()}>
                     <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-xl shrink-0 shadow-sm z-10">
                         <h3 className="text-2xl font-bold text-indigo-400 flex items-center gap-2"><BookHeart size={24}/> 技能與天賦總覽 - {char.name}</h3>
                         <button onClick={() => setDetailItemModal(null)} className="text-gray-400 hover:text-white bg-gray-900 rounded-full p-1.5 border border-gray-600 shadow-sm transition-colors"><X size={20}/></button>
                     </div>
                     <div className="p-6 overflow-y-auto scrollbar-hide space-y-6 flex-1">
                         {ultDef && (
                             <div className="bg-gray-800/50 p-5 rounded-xl border border-red-900/30 shadow-inner">
                                 <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2 border-b border-gray-700/50 pb-2"><Zap size={20}/> 終極技能 (大招)</h4>
                                 <div className="flex gap-4">
                                     <div className="w-16 h-16 rounded-xl border-2 border-red-500/50 bg-gray-800 overflow-hidden flex-shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.3)] relative">
                                         <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getSkillIconUrl(char.ult)} className="w-full h-full object-cover relative z-10" alt="" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='flex';}}/>
                                         <span style={{display:'none'}} className="text-2xl font-black text-red-400 absolute inset-0 flex items-center justify-center z-0">終</span>
                                     </div>
                                     <div className="flex-1 min-w-0">
                                         <div className="font-bold text-lg text-white mb-2">{TXT(ultDef.name)}</div>
                                         <div className="text-sm text-gray-300 leading-relaxed bg-gray-900 p-3 rounded-lg border border-gray-700 shadow-sm">{ultDef.descFn ? ultDef.descFn(cStats, char, battleState) : renderDynamicDesc(ultDef.desc, cStats)}</div>
                                         {renderRelatedBuffs([ ...(ultDef.selfBuff || []).map(b=>b.type), ...(ultDef.partyBuff || []).map(b=>b.type), ...(ultDef.debuffAll || []).map(b=>b.type), ...(ultDef.debuff || []).map(b=>b.type) ], cStats)}
                                     </div>
                                 </div>
                             </div>
                         )}

                         {char.skills && char.skills.length > 0 && (
                             <div className="bg-gray-800/50 p-5 rounded-xl border border-blue-900/30 shadow-inner">
                                 <h4 className="text-blue-400 font-bold mb-4 flex items-center gap-2 border-b border-gray-700/50 pb-2"><Sword size={20}/> 一般技能</h4>
                                 <div className="space-y-6">
                                     {char.skills.map((baseSid, idx) => {
                                         const actualSid = actualSkills[idx]; const isUp = actualSid !== baseSid; const sDef = SKILL_DB[actualSid];
                                         if (!sDef) return null;
                                         return (
                                             <div key={actualSid} className="flex gap-4 border-b border-gray-700/50 pb-6 last:border-0 last:pb-0">
                                                 <div className={`w-16 h-16 rounded-xl border-2 ${isUp ? 'border-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.3)]' : 'border-blue-500/50'} bg-gray-800 overflow-hidden flex-shrink-0 relative`}>
                                                     <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getSkillIconUrl(actualSid)} className="w-full h-full object-cover relative z-10" alt="" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='flex';}}/>
                                                     <span style={{display:'none'}} className={`text-2xl font-black absolute inset-0 flex items-center justify-center z-0 ${isUp ? 'text-orange-400' : 'text-blue-400'}`}>{sDef.name.charAt(0)}</span>
                                                     {isUp && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] px-1 rounded-bl z-20 font-bold shadow-sm">EX</div>}
                                                 </div>
                                                 <div className="flex-1 min-w-0">
                                                     <div className="font-bold text-lg text-white mb-1">{TXT(sDef.name)}</div>
                                                     <div className="text-xs text-gray-500 mb-2 font-mono">CD: {sDef.cd} Turns</div>
                                                     <div className="text-sm text-gray-300 leading-relaxed bg-gray-900 p-3 rounded-lg border border-gray-700 shadow-sm">{sDef.descFn ? sDef.descFn(cStats) : renderDynamicDesc(sDef.desc, cStats)}</div>
                                                     {renderRelatedBuffs(sDef.relatedBuffs, cStats)}
                                                 </div>
                                             </div>
                                         );
                                     })}
                                 </div>
                             </div>
                         )}
                     </div>
                 </div>
             </div>
         );
     }
     
     if (type === 'equip') {
         return (
             <div className="fixed inset-0 z-[9999999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDetailItemModal(null)}>
                 <div className="relative animate-[popIn_0.2s_ease-out_forwards]" onClick={e => e.stopPropagation()}>
                     <button onClick={() => setDetailItemModal(null)} className="absolute -top-4 -right-4 bg-gray-800 text-white rounded-full p-2 hover:bg-red-500 shadow-xl border border-gray-600 z-50"><X size={16}/></button>
                     {renderEquipTooltip(data)}
                 </div>
             </div>
         );
     }
     return null;
  };

  const renderCharDetailModal = () => {
    if (!charDetailView) return null;
    const char = charDetailView;
    const charWithEq = { ...char, equip: globalStorage.charEquips[char.id] || {} };
    const charWithoutEq = { ...char, equip: { weapon: null, head: null, body: null, shoes: null, accessory: null } };
    const statsEq = getStats(charWithEq, true, globalStorage.charTiers, globalStorage.charEquips, runState);
    const statsBase = getStats(charWithoutEq, true, globalStorage.charTiers, {}, runState);
    const tier = globalStorage.charTiers[char.id] || 0;
    const actualSkills = getActualSkills(char, globalStorage.churchUpgrades || []);

    const handleUnequipFromModal = (e, type) => {
        e.preventDefault(); e.stopPropagation();
        const eq = (globalStorage.charEquips[char.id] || {})[type]; if (!eq) return;
        setGlobalStorage(prev => ({ ...prev, equips: [...prev.equips, eq], charEquips: { ...prev.charEquips, [char.id]: { ...(prev.charEquips[char.id] || {}), [type]: null } } }));
    };

    return (
      <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setCharDetailView(null)} onContextMenu={(e)=>{e.preventDefault(); setCharDetailView(null);}}>
        <div className="flex bg-gray-800 border-2 border-blue-500/50 rounded-xl overflow-visible shadow-2xl relative text-white w-full max-w-4xl max-h-[85vh]" onClick={e => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}>
          <button onClick={() => setCharDetailView(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white z-50"><X size={24}/></button>
          
          <div 
             onContextMenu={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (char.imageUrl) {
                    setFullImageView(char);
                    const activeUrl = globalStorage.charSkins?.[char.id] || char.imageUrl;
                    const skinsFromDb = skinDb.filter(s => s.charId === char.id);
                    const skins = [{ name: '預設造型', seriesname: '經典外觀', imageUrl: char.imageUrl }, ...skinsFromDb];
                    const activeIndex = skins.findIndex(s => s.imageUrl === activeUrl || s.url === activeUrl);
                    setCurrentSkinIndex(activeIndex >= 0 ? activeIndex : 0);
                }
             }} 
             title="右鍵點擊完整展開立繪"
             className="w-1/3 relative bg-gray-900 border-r border-gray-700 flex-shrink-0 rounded-l-xl overflow-hidden z-0 flex items-center justify-center cursor-pointer group"
          >
             {getActiveCharImg(char) ? <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getActiveCharImg(char)} className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105" alt={char.name} /> : <span className={`text-9xl ${ELEMENT_COLORS[char.element]} drop-shadow-md`}>{ROLE_ICONS[char.role]}</span>}
             <div className="absolute top-4 left-4 z-20"><img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getRoleIconUrl(char.role, char.element)} className="w-12 h-12 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" alt="" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='block';}}/><span style={{display:'none'}} className={`text-4xl ${ELEMENT_COLORS[char.element]}`}>{ROLE_ICONS[char.role]}</span></div>
          </div>

          <div className="w-2/3 p-6 overflow-y-auto scrollbar-hide flex flex-col relative z-20 pb-32">
             <div className="mb-4 border-b border-gray-700 pb-4">
                 <h2 className={`text-3xl font-bold mb-1 ${RARITY_MAP[RARITY_ORDER[tier]].color}`}>{getCharDisplayName(char, globalStorage.charTiers, globalStorage.churchUpgrades || [])}</h2>
                 <div className="text-gray-400 text-sm font-bold tracking-widest">
                    {typeof char.seriesexhibit === 'string' && char.seriesexhibit && <span className="text-indigo-400 mr-2">[{char.seriesexhibit}]</span>}
                    {typeof char.series === 'string' && char.series ? `${char.series} / ` : ''}{char.type === 'phys' ? '物理攻擊型' : '魔法攻擊型'} / {RARITY_MAP[RARITY_ORDER[tier]].name}階級
                 </div>
             </div>
             
             <div className="mb-6">
                <h3 className="text-yellow-500 font-bold mb-3 text-sm border-b border-gray-700 pb-1">當前裝備 (左鍵點擊查看，右鍵脫下)</h3>
                <div className="flex gap-4">
                   {EQ_TYPES.map(type => {
                      const eq = (globalStorage.charEquips[char.id] || {})[type]; 
                      return (
                          <div key={`modal-eq-${type}`} onContextMenu={e => handleUnequipFromModal(e, type)} onClick={(e) => { e.stopPropagation(); if(eq) setDetailItemModal({type: 'equip', data: eq}); }} className={`relative w-14 h-14 border-2 rounded-xl flex items-center justify-center shrink-0 transition-all ${eq ? 'bg-gray-900 border-gray-600 cursor-pointer hover:border-red-500 ' + RARITY_MAP[eq.rarity].bg : 'bg-gray-900/40 border-gray-800 border-dashed'}`}>
                              {eq?.imageUrl ? <img src={eq.imageUrl} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-full h-full object-contain p-1" alt={eq.name} /> : <span className="opacity-40 text-2xl pointer-events-none">{EQ_MINI_ICONS[type]}</span>}
                              {eq?.refineLevel > 0 && <div className="absolute bottom-0 right-0 bg-black/80 text-white text-[10px] font-bold px-1 rounded-tl-md rounded-br-lg border-t border-l border-gray-600 pointer-events-none">+{eq.refineLevel}</div>}
                          </div>
                      )
                   })}
                </div>
             </div>

             <div className="mb-6 bg-gray-900 p-4 rounded-lg border border-gray-700">
                <h3 className="text-yellow-500 font-bold mb-3 text-sm border-b border-gray-700 pb-1">面板數值 <span className="text-gray-500 text-xs ml-2">(原體質 + 裝備加成)</span></h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm text-gray-300 font-mono">
                   {[ {label: '❤️ 最大生命', key: 'maxHp', isPct: false, color: 'text-white'}, 
                      {label: '⚔️ 物理攻擊', key: 'atk', isPct: false, color: 'text-orange-400'}, 
                      {label: '🪄 魔法攻擊', key: 'matk', isPct: false, color: 'text-purple-400'}, 
                      {label: '🛡️ 物理防禦', key: 'pdef', isPct: false, color: 'text-yellow-400'}, 
                      {label: '🔮 魔法防禦', key: 'mdef', isPct: false, color: 'text-cyan-400'}, 
                      {label: '💥 暴擊率', key: 'crit', isPct: true, color: 'text-gray-300'}, 
                      {label: '🗡️ DA率', key: 'da', isPct: true, color: 'text-red-400'},
                      {label: '🗡️ TA率', key: 'ta', isPct: true, color: 'text-red-400'} ].map(st => {
                      
                      let eqV = statsEq[st.key]; 
                      let basV = statsBase[st.key]; 
                      
                      if (st.key === 'da' || st.key === 'ta') {
                          eqV = Math.min(1.0, eqV);
                      }
                      
                      const diff = eqV - basV;
                      const hasDiff = st.isPct ? Math.abs(diff) >= 0.005 : Math.abs(diff) > 0;
                      const formatVal = (val, isPct) => isPct ? `${(val*100).toFixed(0)}%` : val;
                      const totalStr = formatVal(eqV, st.isPct);
                      const baseStr = formatVal(basV, st.isPct);
                      const diffStr = formatVal(Math.abs(diff), st.isPct);

                      return (
                         <div key={`stat-val-${st.key}`} className="flex justify-between items-center border-b border-gray-800 pb-1">
                            <span>{st.label}</span>
                            <span className="text-right">
                               <span className={`${st.color} font-bold`}>{totalStr}</span>
                               {hasDiff && (
                                   <span className="text-gray-400 text-xs ml-1">
                                       (<span className="text-white">{baseStr}</span>
                                       {diff > 0 ? (
                                           <span className="text-green-400"> +{diffStr}</span>
                                       ) : (
                                           <span className="text-red-400"> -{diffStr}</span>
                                       )})
                                   </span>
                               )}
                            </span>
                         </div>
                      );
                   })}
                </div>
             </div>

             <div className="flex-1 flex flex-col min-h-0 relative z-30">
                <h3 className="text-yellow-500 font-bold mb-3 text-sm border-b border-gray-700 pb-1">戰鬥技能與天賦 <span className="text-gray-500 text-xs ml-2">(點擊查看詳情)</span></h3>
                <div className="flex flex-wrap gap-4 mt-2">
                   {char.ult && ULT_DB[char.ult] && (
                       <div onClick={(e) => { e.stopPropagation(); setDetailItemModal({type: 'all_skills', char: char}); }} className="relative w-14 h-14 bg-gray-800 border-2 border-red-500 rounded-lg flex items-center justify-center cursor-pointer shadow-[0_0_8px_rgba(239,68,68,0.4)] hover:scale-105 transition-transform overflow-hidden">
                           <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getSkillIconUrl(char.ult)} className="w-full h-full object-cover z-0" alt="ult" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='block';}} />
                           <span style={{display: 'none'}} className="text-xl font-black text-red-400 pointer-events-none relative z-10">終</span>
                       </div>
                   )}
                   
                   {char.skills && char.skills.map((baseSid, sIdx) => {
                       const actualSid = actualSkills[sIdx]; const isUp = actualSid !== baseSid; const sDef = SKILL_DB[actualSid];
                       const canBeUpgraded = !isUp && (baseSid === 's_C003_1' || baseSid === 's_C004_1');
                       if (!sDef) return null;
                       return (
                           <div key={`modal-skill-${actualSid}`} onClick={(e) => { e.stopPropagation(); setDetailItemModal({type: 'all_skills', char: char}); }} className={`relative w-14 h-14 bg-gray-800 border-2 ${isUp ? 'border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'border-blue-500'} rounded-lg cursor-pointer shadow-md hover:scale-105 transition-transform`}>
                               <div className="absolute inset-0 overflow-hidden rounded-md flex items-center justify-center">
                                   <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getSkillIconUrl(actualSid)} className="w-full h-full object-cover z-0" alt="skill" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='flex';}} />
                                   <span style={{display: 'none'}} className={`text-xl font-black pointer-events-none relative z-10 ${isUp ? 'text-orange-500' : 'text-blue-400'}`}>{sDef.name.charAt(0)}</span>
                               </div>
                               {canBeUpgraded && <div className="absolute -top-2.5 -right-2.5 bg-gray-900 text-gray-400 rounded-full p-0.5 border border-gray-500 shadow-md z-20"><ArrowUpCircle size={16} /></div>}
                           </div>
                       )
                   })}
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAssembly = () => {
    const handleAdd = (char) => {
      const firstEmpty = partySlots.findIndex(s => s === null);
      if (firstEmpty !== -1 && !partySlots.find(s => s && s.id === char.id)) {
        let newSlots = [...partySlots]; newSlots[firstEmpty] = JSON.parse(JSON.stringify(char)); setPartySlots(newSlots);
      }
    };
    const handleRemove = (idx) => { let newSlots = [...partySlots]; newSlots[idx] = null; setPartySlots(newSlots); };

    return (
      <div className="flex flex-col h-screen overflow-hidden bg-gray-900 text-white p-6 relative">
        <button onClick={() => setScreen('town')} className="absolute top-6 left-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 font-bold"><Home size={18}/>返回城鎮</button>
        
        <h2 className="text-3xl font-bold mb-2 text-center mt-2">集會所</h2>
        <p className="text-center text-gray-400 mb-6 text-sm">點擊左側角色編入隊伍。對已入隊的角色或右側出戰陣列內角色點擊 <span className="text-red-400 font-bold">左鍵</span> 可移出隊伍，<span className="text-yellow-400 font-bold">右鍵</span> 檢視角色詳情與裝備。</p>
        
        <div className="flex flex-row gap-6 max-w-7xl mx-auto w-full flex-1 min-h-0 pb-4">
           <div className="w-3/5 flex flex-col bg-gray-950 rounded-xl p-6 border border-gray-800 shadow-inner min-h-0">
               <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2 shrink-0 px-2">
                   <h3 className="text-xl font-bold text-gray-300">角色一覽</h3>
                   <div className="flex gap-2">
                       <select value={charFilterElem} onChange={e=>setCharFilterElem(e.target.value)} className="bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded border border-gray-700 outline-none">
                           <option value="all">全屬性</option><option value="水">水</option><option value="火">火</option><option value="風">風</option><option value="土">土</option><option value="光">光</option><option value="暗">暗</option>
                       </select>
                       <select value={charFilterRole} onChange={e=>setCharFilterRole(e.target.value)} className="bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded border border-gray-700 outline-none">
                           <option value="all">全職階</option><option value="king">國王</option><option value="queen">皇后</option><option value="bishop">主教</option><option value="knight">騎士</option><option value="rook">城堡</option>
                       </select>
                   </div>
               </div>
               <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto scrollbar-hide pr-2 content-start flex-1">
                  {charPool.filter(c => (charFilterElem === 'all' || c.element === charFilterElem) && (charFilterRole === 'all' || c.role === charFilterRole)).map(char => {
                     if (char.locked) {
                        return (
                           <div key={char.id} className="relative h-40 rounded-xl border-2 border-gray-700 opacity-50 grayscale bg-gray-900 flex flex-col items-center justify-center cursor-not-allowed">
                              <Lock size={32} className="text-gray-500 mb-2"/>
                              <span className="text-sm font-bold text-gray-500">{char.name}</span>
                           </div>
                        )
                     }
                     const isSelected = partySlots.find(s => s && s.id === char.id);
                     const tier = globalStorage.charTiers[char.id] || 0; const isMythic = tier >= 5;
                     const isUpgraded = (globalStorage.churchUpgrades || []).some(u => getChurchUpgrades().find(c => c.id === u)?.charId === char.id);
                     
                     return (
                        <div key={`pool-char-${char.id}`} onContextMenu={(e) => { 
                           e.preventDefault(); 
                           setCharDetailView(char); 
                        }} onClick={() => isSelected ? handleRemove(partySlots.findIndex(s => s && s.id === char.id)) : handleAdd(char)} className={`relative h-40 rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${isSelected ? 'border-red-600 opacity-40 bg-red-950 grayscale' : 'border-gray-500 hover:border-yellow-400 hover:scale-105 shadow-lg group'}`}>
                           {getActiveCharImg(char) ? <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getActiveCharImg(char)} className="absolute inset-0 w-full h-full object-cover object-top" alt={char.name} /> : <div className="absolute inset-0 flex items-center justify-center bg-gray-800"><span className={`text-6xl ${ELEMENT_COLORS[char.element]}`}>{ROLE_ICONS[char.role]}</span></div>}
                           <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/40 to-transparent pointer-events-none"></div>
                           <div className="absolute top-2 left-2 z-10"><img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getRoleIconUrl(char.role, char.element)} className="w-8 h-8 object-contain drop-shadow-md" alt="" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='block';}}/><span style={{display:'none'}} className={`text-2xl drop-shadow-md ${ELEMENT_COLORS[char.element]}`}>{ROLE_ICONS[char.role]}</span></div>
                           {typeof char.seriesexhibit === 'string' && char.seriesexhibit && <div className="absolute bottom-10 right-3 z-10 text-[10px] bg-indigo-900/80 text-indigo-200 px-1.5 py-0.5 rounded shadow-sm font-bold tracking-widest">{TXT(char.seriesexhibit)}</div>}
                           
                           <div className={`absolute bottom-2 left-3 font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,1)] z-10 ${RARITY_MAP[RARITY_ORDER[tier]].color}`}>
                               {isMythic ? <div className="leading-tight"><div className="text-[10px] text-red-500 mb-0.5">{TXT(char.title)}</div><div className="text-lg">{TXT(char.name)}{isUpgraded ? ' ✿' : ''}</div></div> : <div className="text-lg">{TXT(char.name)}{isUpgraded ? ' ✿' : ''}</div>}
                           </div>
                           {!isSelected && <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"><Plus size={16} /></div>}
                        </div>
                     )
                  })}
               </div>
           </div>

           <div className="w-2/5 bg-gray-900 rounded-xl p-4 border border-gray-800 flex flex-col shadow-inner shrink-0">
               <div className="flex justify-between items-center mb-4 px-2">
                   <h3 className="text-xl font-bold text-gray-300">出戰陣列</h3>
                   <button onClick={() => setScreen('select_dungeon')} disabled={partySlots.some(s => s === null)} className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]">出發 <ArrowRight size={18} /></button>
               </div>
               <div className="flex-1 flex flex-row gap-3 justify-center items-start h-full overflow-x-auto scrollbar-hide px-2 pb-2">
                  {partySlots.map((char, idx) => {
                      if (!char) return (
                          <div key={`assembly-slot-${idx}`} className={`relative w-[22%] min-w-[70px] h-full max-h-[360px] rounded-xl border-2 overflow-hidden flex flex-col items-center transition-all bg-gray-800/50 border-gray-700 border-dashed py-6`}>
                              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4"><span className="text-3xl">+</span><span style={{ writingMode: 'vertical-rl' }} className="font-bold text-sm tracking-widest">第{idx + 1}順位</span></div>
                          </div>
                      );
                      
                      const tier = globalStorage.charTiers[char.id] || 0;
                      const isUpgraded = (globalStorage.churchUpgrades || []).some(u => getChurchUpgrades().find(c => c.id === u)?.charId === char.id);
                      
                      return (
                          <div key={`assembly-slot-${idx}`} onContextMenu={(e)=>{e.preventDefault(); setCharDetailView(char);}} onClick={() => handleRemove(idx)} className={`relative w-[22%] min-w-[70px] h-full max-h-[360px] rounded-xl border-2 overflow-hidden flex flex-col items-center transition-all border-gray-600 cursor-pointer hover:border-red-500 shadow-md group`}>
                             {getActiveCharImg(char) ? <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getActiveCharImg(char)} className="absolute inset-0 w-full h-full object-cover object-top z-0" alt={char.name}/> : <div className="absolute inset-0 flex items-center justify-center opacity-30 text-7xl z-0">{ROLE_ICONS[char.role]}</div>}
                             <div className="absolute bottom-0 left-0 w-full h-3/5 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent z-10 pointer-events-none"></div>
                             <div className="relative z-20 flex-1 flex items-end justify-center w-full pb-4">
                                 <div style={{ writingMode: 'vertical-rl' }} className={`font-bold text-xl tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,1)] ${RARITY_MAP[RARITY_ORDER[tier]].color}`}>{TXT(char.name)}{isUpgraded ? ' ✿' : ''}</div>
                             </div>
                             <div className="relative z-20 text-gray-400 text-xs font-mono mb-4 bg-gray-950/80 px-2 py-0.5 rounded border border-gray-800 shadow-sm">P{idx + 1}</div>
                             <div className="absolute inset-0 bg-red-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-30 pointer-events-none">
                                <span style={{ writingMode: 'vertical-rl' }} className="text-white font-bold text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-widest">點擊移除</span>
                             </div>
                          </div>
                      );
                  })}
               </div>
           </div>
        </div>
      </div>
    );
  };

  const renderSynthesis = () => {
     const isBlacksmith = prevScreen === 'town';
     const checkCost = (cost) => Object.entries(cost).every(([mat, qty]) => {
         const matName = materialDb[mat]?.name || mat;
         return (globalStorage.materials[mat] || globalStorage.materials[matName] || 0) >= qty;
     });
     const handleCraft = (recipe) => {
        if(!checkCost(recipe.cost)) return;
        
        // 檢查是否選擇了指定階級且強化石是否足夠
        if (targetRarity !== 'random') {
            const stoneName = RARITY_MAP[targetRarity].name + '強化石';
            if ((globalStorage.refineStones[targetRarity] || 0) < 1) {
                return showDialog('強化石不足', `需要 1 顆 ${stoneName}。`);
            }
        }

        let newMats = {...globalStorage.materials}; 
        Object.entries(recipe.cost).forEach(([mat, qty]) => { 
            const matName = materialDb[mat]?.name || mat;
            if ((newMats[mat] || 0) >= qty) {
                newMats[mat] -= qty;
            } else if ((newMats[matName] || 0) >= qty) {
                newMats[matName] -= qty;
            } else {
                newMats[matName] = Math.max(0, (newMats[matName] || 0) - qty);
            }
        });
        
        let newRefines = { ...globalStorage.refineStones };
        let r = 'common';
        if (targetRarity !== 'random') {
            r = targetRarity;
            newRefines[targetRarity] -= 1;
        } else {
            const roll = Math.random(); 
            if(roll < 0.15) r = 'uncommon'; 
            else if (roll < 0.50) r = 'rare';
        }
        
        const newEq = generateEquip(1, equipRecipes, r, recipe.name, recipe.type);
        setGlobalStorage(prev => ({...prev, materials: newMats, refineStones: newRefines, equips: [...prev.equips, newEq]}));
        setCraftedEquipModal(newEq);
     };

     const handleUpgrade = (targetEq) => {
        if (globalStorage.upgradeStones < 1) return showDialog('升階石不足', '沒有足夠的升階石來進行裝備強化！');
        const rIdx = RARITY_ORDER.indexOf(targetEq.rarity);
        if (rIdx >= RARITY_ORDER.length - 1) return showDialog('無法升階', '裝備已達到最高階級！');
        
        const newRarity = RARITY_ORDER[rIdx + 1]; const newStats = {}; 
        const safeRecipes = equipRecipes || [];
        const recipe = safeRecipes.find(r => r.name === targetEq.name) || safeRecipes.find(r => r.type === targetEq.type);
        const newThresholds = recipe ? (recipe.thresholds[newRarity] || recipe.thresholds['common']) : null;

        for(let k in targetEq.stats) {
            if(k==='crit' || k==='da' || k==='ta') newStats[k] = parseFloat((targetEq.stats[k] + randRange(1,3)/100).toFixed(3));
            else {
                let scaled = Math.floor(targetEq.stats[k] * (1.25 + Math.random() * 0.2));
                if (newThresholds && newThresholds[k]) scaled = Math.max(scaled, newThresholds[k][0]);
                newStats[k] = Math.max(targetEq.stats[k], scaled);
            }
        }
        
        if (newThresholds) {
            for (let k in newThresholds) {
                if (newStats[k] === undefined) {
                    const [min, max] = newThresholds[k];
                    if (k === 'crit' || k === 'da' || k === 'ta') newStats[k] = parseFloat((min + Math.random() * (max - min)).toFixed(3));
                    else newStats[k] = randRange(min, max);
                }
            }
        }
        
        const upgradedEq = { ...targetEq, rarity: newRarity, stats: newStats, refineBonus: targetEq.refineBonus || {}, price: Math.floor(targetEq.price * 1.5) };

        setGlobalStorage(prev => {
            if (targetEq._isEq) return { ...prev, upgradeStones: prev.upgradeStones - 1, charEquips: { ...prev.charEquips, [targetEq._charId]: { ...(prev.charEquips[targetEq._charId] || {}), [targetEq._eqType]: upgradedEq } } };
            else return { ...prev, upgradeStones: prev.upgradeStones - 1, equips: prev.equips.map(e => e.id === targetEq.id ? upgradedEq : e) };
        });
        showDialog('升階成功', `裝備 [${targetEq.name}] 成功提升為 ${RARITY_MAP[newRarity].name} 階級！`, 'alert');
        setSelectedEq(upgradedEq);
     };

     const handleToggleDismantle = (eq) => setDismantleSelections(prev => prev.includes(eq.id) ? prev.filter(id => id !== eq.id) : [...prev, eq.id]);

     const handleBatchDismantle = () => {
         const toDismantle = fullList.filter(e => !e._isEq && dismantleSelections.includes(e.id));
         if(toDismantle.length === 0) return;
         showDialog('確認分解', `確定要分解這 ${toDismantle.length} 件裝備嗎？`, 'confirm', () => {
             let yieldStones = {}; toDismantle.forEach(eq => { yieldStones[eq.rarity] = (yieldStones[eq.rarity] || 0) + 1; });
             setGlobalStorage(prev => {
                 const newRefines = { ...prev.refineStones };
                 for (let r in yieldStones) newRefines[r] = (newRefines[r] || 0) + yieldStones[r];
                 return { ...prev, refineStones: newRefines, equips: prev.equips.filter(e => !dismantleSelections.includes(e.id)) };
             });
             setDismantleSelections([]);
             setTimeout(() => showDialog('分解成功', `成功分解 ${toDismantle.length} 件裝備！`, 'alert'), 100);
         });
     };

     const handleRefine = (targetEq) => {
         const rLvl = targetEq.refineLevel || 0;
         if (rLvl >= 12) return showDialog('已達上限', '該裝備已達到最高強化等級(+12)。');
         let cost = rLvl >= 9 ? 3 : (rLvl >= 4 ? 2 : 1);

         if ((globalStorage.refineStones?.[targetEq.rarity] || 0) < cost) return showDialog('強化石不足', `需要 ${cost} 顆 ${RARITY_MAP[targetEq.rarity].name}強化石。`);
         
         let newBonus = { ...(targetEq.refineBonus || {}) };
         Object.keys(targetEq.stats).forEach(k => {
             let boostPct = 0; let probBoost = 0;
             if (rLvl >= 0 && rLvl <= 3) { boostPct = randRange(2, 4) / 100; probBoost = randRange(1, 2) / 100; } 
             else if (rLvl >= 4 && rLvl <= 8) { boostPct = randRange(4, 6) / 100; probBoost = randRange(2, 3) / 100; } 
             else if (rLvl >= 9 && rLvl <= 11) { boostPct = randRange(7, 10) / 100; probBoost = randRange(3, 5) / 100; }

             if (k === 'crit' || k === 'da' || k === 'ta') newBonus[k] = parseFloat(((newBonus[k] || 0) + probBoost).toFixed(4));
             else newBonus[k] = (newBonus[k] || 0) + Math.max(1, Math.floor((targetEq.stats[k] + (newBonus[k] || 0)) * boostPct));
         });
         
         const refinedEq = { ...targetEq, refineBonus: newBonus, refineLevel: rLvl + 1 };
         setGlobalStorage(prev => {
             const newRefines = { ...prev.refineStones }; newRefines[targetEq.rarity] -= cost;
             if (targetEq._isEq) return { ...prev, refineStones: newRefines, charEquips: { ...prev.charEquips, [targetEq._charId]: { ...(prev.charEquips[targetEq._charId] || {}), [targetEq._eqType]: refinedEq } } };
             else return { ...prev, refineStones: newRefines, equips: prev.equips.map(e => e.id === targetEq.id ? refinedEq : e) };
         });
         showDialog('強化成功', `裝備 [${targetEq.name}] 的數值獲得了提升！(目前強化等級: +${rLvl + 1})`, 'alert');
         setSelectedEq(refinedEq);
     };

     let upgradeList = []; let fullList = [];
     charPool.forEach(p => {
        Object.entries(globalStorage.charEquips[p.id] || {}).forEach(([eqType, eq]) => {
           if(eq) {
               fullList.push({ ...eq, _isEq: true, _charName: p.name, _charId: p.id, _charIdx: partySlots.findIndex(ps => ps && ps.id === p.id), _eqType: eqType });
               if (RARITY_ORDER.indexOf(eq.rarity) < RARITY_ORDER.length - 1) upgradeList.push({ ...eq, _isEq: true, _charName: p.name, _charId: p.id, _charIdx: partySlots.findIndex(ps => ps && ps.id === p.id), _eqType: eqType });
           }
        });
     });
     globalStorage.equips.forEach(eq => {
         fullList.push({ ...eq, _isEq: false });
         if (RARITY_ORDER.indexOf(eq.rarity) < RARITY_ORDER.length - 1) upgradeList.push({ ...eq, _isEq: false });
     });

     if (eqFilter !== 'all') {
         upgradeList = upgradeList.filter(eq => eq.type === eqFilter);
         fullList = fullList.filter(eq => eq.type === eqFilter);
     }
     
     const renderBlacksmithGroup = (list, isDismantleMode = false) => {
         let hasAny = false;
         const content = EQ_TYPES.map(t => {
             const items = list.filter(e => e.type === t).sort((a,b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity));
             if (items.length === 0) return null;
             hasAny = true;
             return (
                 <div key={`bs-group-${t}`} className="mb-4">
                     <h4 className="text-gray-400 text-xs font-bold mb-2 border-b border-gray-700 pb-1">{EQ_ICONS[t]}</h4>
                     <div className="flex flex-wrap gap-2">
                        {items.map(eq => {
                           const isSelected = isDismantleMode ? dismantleSelections.includes(eq.id) : selectedEq?.id === eq.id;
                           return (
                              <div key={`bs-item-${eq.id}`} 
                                  onClick={() => isDismantleMode ? handleToggleDismantle(eq) : setSelectedEq(eq)} 
                                  onContextMenu={(e) => { e.preventDefault(); setCharDetailView({...eq, isEqDetail: true}); }}
                                  onMouseEnter={(e) => handleTooltipOpen(e, 'equip', eq)}
                                  onMouseMove={handleTooltipMove} onMouseLeave={handleTooltipClose}
                                  className={`group relative w-16 h-16 border-2 rounded-xl flex items-center justify-center transition-all shadow-md ${RARITY_MAP[eq.rarity].bg} ${RARITY_MAP[eq.rarity].border} cursor-pointer hover:border-blue-400 hover:scale-105 z-0 hover:z-10`}>
                                 {eq.imageUrl ? (
                                    <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={eq.imageUrl} className="w-full h-full object-contain p-1" alt={eq.name} />
                                 ) : (
                                    <span className="opacity-70 text-2xl pointer-events-none">{EQ_MINI_ICONS[t]}</span>
                                 )}
                                 {eq.refineLevel > 0 && <div className="absolute bottom-0 right-0 bg-black/80 text-white text-[10px] font-bold px-1 rounded-tl-md rounded-br-lg border-t border-l border-gray-600 pointer-events-none">+{eq.refineLevel}</div>}
                                 {isDismantleMode && isSelected && <div className="absolute top-1 right-1 w-3 h-3 bg-orange-500 rounded-full shadow-md pointer-events-none"></div>}
                              </div>
                           )
                        })}
                     </div>
                 </div>
             )
         });
         return hasAny ? content : <div className="text-center text-gray-500 py-10">無符合條件的裝備。</div>;
     };

     const equipChar = partySlots[selCharIdx] ? charPool.find(c => c.id === partySlots[selCharIdx].id) : null;

     const handleEquipFromBag = (eqItem) => {
        if (!equipChar) return;
        handleTooltipClose(); setHoveredEqType(null);
        setGlobalStorage(prev => {
            const newEquips = prev.equips.filter(e => e.id !== eqItem.id);
            const currentEq = (prev.charEquips[equipChar.id] || {})[eqItem.type];
            if (currentEq) newEquips.push(currentEq);
            return { ...prev, equips: newEquips, charEquips: { ...prev.charEquips, [equipChar.id]: { ...(prev.charEquips[equipChar.id] || {}), [eqItem.type]: eqItem } } };
        });
     };

     const handleUnequipToBag = (type) => {
        if (!equipChar) return;
        const eq = (globalStorage.charEquips[equipChar.id] || {})[type]; if(!eq) return;
        handleTooltipClose(); setHoveredEqType(null);
        setGlobalStorage(prev => ({ ...prev, equips: [...prev.equips, eq], charEquips: { ...prev.charEquips, [equipChar.id]: { ...(prev.charEquips[equipChar.id] || {}), [type]: null } } }));
     };

     const handleAutoEquip = () => {
         if (!equipChar) return;
         setGlobalStorage(prev => {
             let availableEquips = [...prev.equips];
             let currentCharEquip = { ...(prev.charEquips[equipChar.id] || {}) };
             let changed = false;

             EQ_TYPES.forEach(type => {
                 if (!currentCharEquip[type]) { // 只針對尚未穿戴的部位
                     let candidates = availableEquips.filter(e => e.type === type);
                     if (candidates.length > 0) {
                         candidates.sort((a, b) => {
                             const getScore = (eq) => {
                                 const st = eq.stats || {};
                                 const rb = eq.refineBonus || {};
                                 const sum = (k1, k2) => (st[k1] || st[k2] || 0) + (rb[k1] || rb[k2] || 0);
                                 
                                 let score = 0;
                                 if (equipChar.role === 'rook') {
                                     // 城堡優先：生命與防禦 (生命數值較大，做個稍微的權重平衡)
                                     score += sum('hp', 'maxHp') * 0.1;
                                     score += sum('pdef', 'pDef');
                                     score += sum('mdef', 'mDef');
                                 } else if (equipChar.type === 'phys') {
                                     score += sum('atk', 'pAtk');
                                     score += sum('crit', 'crit') * 500;
                                     score += sum('da', 'da') * 300;
                                 } else {
                                     score += sum('matk', 'mAtk');
                                     score += sum('crit', 'crit') * 500;
                                     score += sum('ta', 'ta') * 300;
                                 }
                                 return score;
                             };
                             return getScore(b) - getScore(a); // 降序排列
                         });
                         
                         const bestEq = candidates[0];
                         currentCharEquip[type] = bestEq;
                         availableEquips = availableEquips.filter(e => e.id !== bestEq.id);
                         changed = true;
                     }
                 }
             });

             if (changed) {
                 return {
                     ...prev,
                     equips: availableEquips,
                     charEquips: {
                         ...prev.charEquips,
                         [equipChar.id]: currentCharEquip
                     }
                 };
             }
             return prev;
         });
     };

     const handleUnequipAll = () => {
         if (!equipChar) return;
         setGlobalStorage(prev => {
             const currentCharEquip = prev.charEquips[equipChar.id] || {};
             const itemsToReturn = Object.values(currentCharEquip).filter(Boolean);
             if (itemsToReturn.length === 0) return prev; // 沒有裝備可卸下

             return {
                 ...prev,
                 equips: [...prev.equips, ...itemsToReturn],
                 charEquips: {
                     ...prev.charEquips,
                     [equipChar.id]: {} // 清空該角色裝備
                 }
             };
         });
         handleTooltipClose();
         setHoveredEqType(null);
     };

     const renderEquipSection = (typeId, typeName) => {
         const secEquips = filteredEquips.filter(eq => eq.type === typeId);
         if (eqFilter !== 'all' && eqFilter !== typeId) return null;
         
         return (
            <div key={`inv-sec-${typeId}`}>
               <h4 className="text-gray-400 text-xs font-bold mb-2 flex items-center gap-2">{typeName}</h4>
               <div className="flex flex-wrap gap-2 mb-4">
                  {secEquips.map((eq) => {
                     return (
                         <div key={`inv-eq-${eq.id}`} 
                            onClick={() => handleEquipFromBag(eq)} 
                            onMouseEnter={(e) => { 
                                setHoveredEqType(eq.type); 
                                const currentEq = equipChar ? (globalStorage.charEquips[equipChar.id] || {})[eq.type] : null;
                                handleTooltipOpen(e, 'compare', { eq, currentEq });
                            }}
                            onMouseMove={handleTooltipMove} onMouseLeave={() => { setHoveredEqType(null); handleTooltipClose(); }}
                            className={`group relative w-16 h-16 border-2 rounded-xl flex items-center justify-center transition-all shadow-md ${RARITY_MAP[eq.rarity].bg} ${RARITY_MAP[eq.rarity].border} cursor-pointer hover:border-blue-400 hover:scale-105 z-0 hover:z-10`}>
                            {eq.imageUrl ? (
                               <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={eq.imageUrl} className="w-full h-full object-contain p-1" alt={eq.name} />
                            ) : (
                               <span className="opacity-70 text-2xl pointer-events-none">{EQ_MINI_ICONS[eq.type]}</span>
                            )}
                            {eq.refineLevel > 0 && <div className="absolute bottom-0 right-0 bg-black/80 text-white text-[10px] font-bold px-1 rounded-tl-md rounded-br-lg border-t border-l border-gray-600 pointer-events-none">+{eq.refineLevel}</div>}
                         </div>
                     )
                  })}
                  {secEquips.length === 0 && <div className="text-gray-600 text-sm py-2">無可用裝備</div>}
               </div>
               <hr className="border-gray-700 mb-4" />
            </div>
         );
     };

     let filteredEquips = globalStorage.equips;
     if (eqFilter !== 'all') filteredEquips = filteredEquips.filter(eq => eq.type === eqFilter);
     filteredEquips.sort((a,b) => { 
         const typeOrder = {weapon:0, head:1, body:2, shoes:3, accessory:4}; 
         return typeOrder[a.type] - typeOrder[b.type] || a.price - b.price; 
     });

     return (
       <div className="flex flex-col h-screen overflow-hidden bg-gray-900 text-white p-6 relative">
         
         <button onClick={() => setScreen(prevScreen || 'town')} className="absolute top-6 left-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 font-bold z-50">
            {prevScreen === 'town' ? <Home size={18}/> : <ArrowRight size={18} className="rotate-180"/>} 返回
         </button>
         
         {synthTab === 'craft' && (
             <button onClick={() => setMaterialModalOpen(true)} className="absolute top-6 right-6 px-4 py-2 bg-indigo-700 hover:bg-indigo-600 rounded flex items-center gap-2 font-bold z-50">素材倉庫</button>
         )}

         <div className="flex justify-center items-center gap-4 mb-6">
            {isBlacksmith ? (
                <><Hammer size={40} className="text-orange-400"/><h2 className="text-4xl font-bold">鐵匠鋪</h2></>
            ) : (
                <><Backpack size={40} className="text-indigo-400"/><h2 className="text-4xl font-bold">裝備與背包</h2></>
            )}
         </div>

         <div className="max-w-6xl mx-auto w-full flex-1 min-h-0 flex flex-col">
            <div className="flex justify-between items-end mb-4 relative">
               {isBlacksmith ? (
                   <div className="flex gap-2">
                      <button onClick={()=>{setSynthesisTab('craft'); setSelectedEq(null); setDismantleSelections([]);}} className={`px-6 py-2 rounded-t-lg font-bold text-lg ${synthTab==='craft'?'bg-gray-800 text-orange-400 border-t border-l border-r border-orange-500/50':'bg-gray-950 text-gray-500 hover:text-white'}`}>打造</button>
                      <button onClick={()=>{setSynthesisTab('upgrade'); setSelectedEq(null); setDismantleSelections([]);}} className={`px-6 py-2 rounded-t-lg font-bold text-lg ${synthTab==='upgrade'?'bg-gray-800 text-orange-400 border-t border-l border-r border-orange-500/50':'bg-gray-950 text-gray-500 hover:text-white'}`}>升階</button>
                      <button onClick={()=>{setSynthesisTab('refine'); setSelectedEq(null); setDismantleSelections([]);}} className={`px-6 py-2 rounded-t-lg font-bold text-lg ${synthTab==='refine'?'bg-gray-800 text-orange-400 border-t border-l border-r border-orange-500/50':'bg-gray-950 text-gray-500 hover:text-white'}`}>強化</button>
                      <button onClick={()=>{setSynthesisTab('dismantle'); setSelectedEq(null); setDismantleSelections([]);}} className={`px-6 py-2 rounded-t-lg font-bold text-lg ${synthTab==='dismantle'?'bg-gray-800 text-orange-400 border-t border-l border-r border-orange-500/50':'bg-gray-950 text-gray-500 hover:text-white'}`}>分解</button>
                      <button onClick={()=>{setSynthesisTab('equip'); setSelectedEq(null); setDismantleSelections([]);}} className={`px-6 py-2 rounded-t-lg font-bold text-lg ${synthTab==='equip'?'bg-gray-800 text-blue-400 border-t border-l border-r border-blue-500/50':'bg-gray-950 text-gray-500 hover:text-white'}`}>穿搭</button>
                   </div>
               ) : (
                   <div className="flex gap-2">
                       <div className="px-6 py-2 rounded-t-lg font-bold text-lg bg-gray-800 text-blue-400 border-t border-l border-r border-blue-500/50">穿搭與背包</div>
                   </div>
               )}
               
               {synthTab === 'upgrade' && (
                  <div className="bg-gray-800 px-5 py-2 rounded-full flex items-center gap-2 font-bold text-yellow-400 border border-gray-700 shadow-md ml-auto">
                      {getMatImg('升階石') ? <img src={getMatImg('升階石')} className="w-5 h-5 object-contain" alt=""/> : <ArrowUpCircle size={18}/>}
                      <span>升階石: {globalStorage.upgradeStones || 0}</span>
                  </div>
               )}
               
               {synthTab === 'refine' && (
                  <div className="flex items-center gap-3 ml-auto">
                     <div className="text-right bg-gray-800 px-4 py-1.5 rounded-xl border border-gray-700 shadow-md flex items-center gap-3">
                        <div className="text-xs text-gray-400 font-bold flex items-center gap-1"><Sparkles size={14}/> 強化石:</div>
                        <div className="flex gap-3">
                            {RARITY_ORDER.map(r => {
                                const stoneName = RARITY_MAP[r].name + '強化石';
                                const stoneImg = getMatImg(stoneName);
                                return (
                                    <div key={`stone-${r}`} className={`flex items-center justify-center gap-1 ${RARITY_MAP[r].color}`}>
                                        {stoneImg ? <img src={stoneImg} className="w-5 h-5 object-contain drop-shadow-sm" alt={stoneName}/> : <Sparkles size={16} />}
                                        <span className="text-[10px] font-black">{globalStorage.refineStones[r] || 0}</span>
                                    </div>
                                );
                            })}
                        </div>
                     </div>
                     <button onClick={() => showDialog('強化', '強化可提升裝備數值。\n\n強化加成：\n+0~3：雙攻雙防 2~4% / 機率類 1~2%\n+4~8：雙攻雙防 4~6% / 機率類 2~3%\n+9~12：雙攻雙防 7~10% / 機率類 3~5%\n\n強化需求：\n+0~3：需要 1 顆同稀有度強化石\n+4~8：需要 2 顆同稀有度強化石\n+9~12：需要 3 顆同稀有度強化石\n\n目前強化等級上限為 +12。', 'alert')} className="w-8 h-8 rounded-full bg-gray-800 border border-gray-600 text-gray-400 hover:text-white hover:border-yellow-400 flex items-center justify-center transition-all shadow-md group relative">
                        <Info size={16}/>
                        <span className="absolute -bottom-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50">強化資訊</span>
                     </button>
                  </div>
               )}
            </div>

            {synthTab === 'equip' ? (
                <div className="flex-1 min-h-0 bg-gray-800 border border-gray-700 rounded-b-lg rounded-tr-lg p-6 flex gap-6">
                    <div className="w-1/3 bg-gray-900/50 rounded-xl p-3 border border-gray-700 flex flex-col h-full overflow-hidden">
                        <div className="flex w-full mb-3 bg-gray-900 rounded-lg shrink-0 overflow-hidden border border-gray-700 divide-x divide-gray-700">
                          {partySlots.map((p, i) => (
                             <div key={`p_slot_${i}`} onClick={() => p && setSelCharIdx(i)} className={`flex-1 h-10 relative cursor-pointer flex items-center justify-center transition-all ${p ? (selCharIdx===i ? 'bg-blue-800/80' : 'bg-gray-800 hover:bg-gray-750 opacity-60') : 'bg-gray-950 cursor-not-allowed opacity-30'}`}>
                                 {p ? (
                                     <>
                                        {getActiveCharImg(p) && <img src={getActiveCharImg(p)} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-full h-full object-cover object-top opacity-40 mix-blend-overlay" alt=""/>}
                                        <span className={`relative z-10 text-lg drop-shadow-md ${selCharIdx===i ? ELEMENT_COLORS[p.element] : 'text-gray-400'}`}>{ROLE_ICONS[p.role]}</span>
                                     </>
                                 ) : <span className="text-gray-700">+</span>}
                             </div>
                          ))}
                        </div>
                        {equipChar && (
                          <div className="flex-1 flex flex-col shrink-0 min-h-0">
                             <h3 className={`text-lg font-bold mb-2 text-center shrink-0 ${RARITY_MAP[RARITY_ORDER[globalStorage.charTiers[equipChar.id]||0]].color}`}>{getCharDisplayName(equipChar, globalStorage.charTiers, globalStorage.churchUpgrades || [])}</h3>
                             <div className="flex-1 flex flex-col items-center justify-start gap-1.5 w-full px-1 overflow-y-auto scrollbar-hide">
                                {EQ_TYPES.map(type => {
                                   const eq = (globalStorage.charEquips[equipChar.id] || {})[type];
                                   const isHovered = hoverEqType === type;
                                   return (
                                      <div key={`char-eq-${type}`} onClick={() => eq && handleUnequipToBag(type)} 
                                         onMouseEnter={(e) => eq && handleTooltipOpen(e, 'equip', eq, true)}
                                         onMouseMove={handleTooltipMove} onMouseLeave={handleTooltipClose}
                                         className={`group relative w-full max-w-[260px] border-2 rounded-lg flex items-center gap-2 p-1.5 transition-all shadow-md shrink-0 ${eq ? 'cursor-pointer hover:border-red-500 bg-gray-900 ' + RARITY_MAP[eq.rarity].border : 'bg-gray-900/50 border-gray-700 border-dashed'} ${isHovered ? 'ring-2 ring-yellow-400 z-10' : 'z-0'}`}>
                                         
                                         <div className={`relative w-10 h-10 shrink-0 border rounded-md flex items-center justify-center bg-gray-900 ${eq ? RARITY_MAP[eq.rarity].bg + ' ' + RARITY_MAP[eq.rarity].border : 'border-gray-600'}`}>
                                             {eq?.imageUrl ? (
                                                <img src={eq.imageUrl} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-full h-full object-contain p-0.5" alt={eq.name} />
                                             ) : (
                                                <span className="opacity-40 text-lg pointer-events-none">{EQ_MINI_ICONS[type]}</span>
                                             )}
                                             {eq?.refineLevel > 0 && <div className="absolute bottom-0 right-0 bg-black/80 text-white text-[8px] font-bold px-1 rounded-tl border-t border-l border-gray-600 pointer-events-none">+{eq.refineLevel}</div>}
                                         </div>
                                         
                                         <div className="flex-1 min-w-0 text-left">
                                            {eq ? (
                                                <>
                                                   <div className={`font-bold text-xs truncate ${RARITY_MAP[eq.rarity].color}`}>{eq.refineLevel > 0 ? `${TXT(eq.name)} +${eq.refineLevel}` : TXT(eq.name)}</div>
                                                   <div className="text-[9px] text-gray-300 font-mono mt-0.5 truncate">{getInlineStatString(eq, true)}</div>
                                                </>
                                            ) : (
                                                <div className="text-gray-500 text-xs font-bold">{EQ_ICONS[type]}</div>
                                            )}
                                         </div>
                                         
                                      </div>
                                   )
                                })}
                                <div className="flex justify-center gap-2 mb-3 shrink-0">
                                 <button onClick={handleAutoEquip} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-[11px] font-bold shadow-sm transition-colors border border-blue-500 text-white flex-1 flex items-center justify-center gap-1">
                                     <Sparkles size={12}/> 穿戴
                                 </button>
                                 <button onClick={handleUnequipAll} className="px-3 py-1.5 bg-gray-700 hover:bg-red-800 rounded-lg text-[11px] font-bold shadow-sm transition-colors border border-gray-600 text-gray-300 hover:text-white flex-1 flex items-center justify-center gap-1">
                                     <X size={12}/> 卸下
                                 </button>
                                </div>
                             </div>
                          </div>
                          
                        )}
                    </div>
                    
                    <div className="flex-1 bg-gray-900/50 rounded-xl p-4 border border-gray-700 flex flex-col h-full min-h-0">
                       <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                          <div className="flex gap-2">
                             <button onClick={()=>setInvTab('equips')} className={`px-4 py-2 font-bold rounded ${invTab==='equips'?'bg-blue-600 text-white':'bg-gray-900 text-gray-400'}`}>裝備</button>
                             <button onClick={()=>setInvTab('items')} className={`px-4 py-2 font-bold rounded ${invTab==='items'?'bg-blue-600 text-white':'bg-gray-900 text-gray-400'}`}>素材與道具</button>
                          </div>
                          {invTab === 'equips' && (
                             <div className="flex bg-gray-900 rounded p-1">
                                {[{id:'all',l:'全部'},{id:'weapon',l:'⚔️'},{id:'head',l:'🪖'},{id:'body',l:'👕'},{id:'shoes',l:'🥾'},{id:'accessory',l:'💍'}].map(f => (
                                    <button key={`inv-filt-${f.id}`} onClick={()=>setEqFilter(f.id)} className={`px-2 py-1 text-xs font-bold rounded ${eqFilter===f.id?'bg-blue-600 text-white':'text-gray-400 hover:text-white'}`} title={f.id}>{f.l}</button>
                                ))}
                             </div>
                          )}
                       </div>
                       
                       {invTab === 'equips' ? (
                         <div className="overflow-y-auto pr-2 content-start flex-1 scrollbar-hide">
                            {renderEquipSection('weapon', '⚔️ 武器')}
                            {renderEquipSection('head', '🪖 頭部裝備')}
                            {renderEquipSection('body', '👕 身體裝備')}
                            {renderEquipSection('shoes', '🥾 腳部裝備')}
                            {renderEquipSection('accessory', '💍 飾品')}
                         </div>
                       ) : (
                         <div className="space-y-3 overflow-y-auto pr-2 flex-1 content-start scrollbar-hide">
                            {runItems.length > 0 && <h4 className="text-gray-400 text-xs font-bold mb-2">當前持有道具</h4>}
                            {runItems.map((it) => (
                               <div key={it.instanceId} className="bg-gray-900 border border-gray-700 p-3 rounded-lg flex justify-between items-center min-h-[60px]">
                                  <div className="flex items-center gap-3">
                                     {it.imageUrl && <img src={it.imageUrl} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-12 h-12 object-contain" alt=""/>}
                                     <div><div className={`font-bold text-sm ${RARITY_MAP[it.rarity].color}`}>{TXT(it.name)}</div><div className="text-xs text-gray-400 mt-1">{TXT(it.desc)}</div></div>
                                  </div>
                               </div>
                            ))}
                            {runItems.length === 0 && <div className="text-gray-500 text-sm py-2">目前沒有任何道具。</div>}
                            <h4 className="text-gray-400 text-xs font-bold mt-4 mb-2">採集素材</h4>
                            <div className="grid grid-cols-2 gap-3">
                               {Object.entries(globalStorage.materials).filter(([m,q])=>q>0).sort((a,b)=>RARITY_ORDER.indexOf(getMatData(a[0]).rarity) - RARITY_ORDER.indexOf(getMatData(b[0]).rarity)).map(([mat, qty]) => (
                                   <div key={`inv-mat-${mat}`} className="flex justify-between items-center bg-gray-900 p-3 rounded border border-gray-700">
                                      <div className="flex items-center gap-2">
                                         {getMatData(mat).imageUrl && <img src={getMatData(mat).imageUrl} className="w-6 h-6 object-contain" alt=""/>}
                                         <span className={`font-bold ${getMatColorLocal(mat)}`}>{TXT(mat)}</span>
                                      </div>
                                      <span className="text-white font-bold">x{qty}</span>
                                   </div>
                               ))}
                               {Object.keys(globalStorage.materials).length === 0 && <div className="text-gray-500 text-sm py-2 col-span-2">目前尚無素材</div>}
                            </div>
                         </div>
                       )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 min-h-0 bg-gray-800 border border-gray-700 rounded-b-lg rounded-tr-lg p-6 flex gap-6">
                   <div className="w-1/2 border-r border-gray-700 pr-6 flex flex-col min-h-0">
                      {(synthTab === 'craft' || synthTab === 'upgrade' || synthTab === 'refine' || synthTab === 'dismantle') && (
                         <div className="flex bg-gray-900 rounded-lg p-1.5 border border-gray-700 mb-4 shrink-0 w-full justify-between shadow-inner">
                            {[{id:'all',l:'全部'},{id:'weapon',l:'⚔️ 武器'},{id:'head',l:'🪖 頭部'},{id:'body',l:'👕 身體'},{id:'shoes',l:'🥾 腳部'},{id:'accessory',l:'💍 飾品'}].map(f => (
                                <button key={`filt-${f.id}`} onClick={()=>setEqFilter(f.id)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all mx-0.5 ${eqFilter===f.id?'bg-blue-600 text-white shadow-md':'text-gray-400 hover:text-white hover:bg-gray-800'}`} title={f.id}>{f.l}</button>
                            ))}
                         </div>
                      )}
                      <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
                      {synthTab === 'craft' && (
                         <div className="grid grid-cols-1 gap-2">
                            {equipRecipes.filter(r => eqFilter === 'all' || r.type === eqFilter).map((r, i) => {
                               const canCraft = checkCost(r.cost);
                               return (
                                 <div key={`rcp-${i}`} onClick={()=>setSelectedEq(r)} className={`bg-gray-900 border py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-700 transition-all ${selectedEq?.id === r.id ? 'border-orange-500 bg-gray-750' : 'border-gray-700'} ${!canCraft ? 'opacity-40 grayscale' : ''}`}>
                                    <div className="font-bold text-white flex justify-between items-center text-sm">
                                       <div className="flex items-center gap-2">
                                          {r.imageUrl && <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={r.imageUrl} className="w-6 h-6 object-contain" alt=""/>}
                                          <span>{TXT(r.name)}</span>
                                       </div>
                                       {!canCraft && <span className="text-[10px] text-red-400 bg-red-900/30 px-2 py-0.5 rounded">素材不足</span>}
                                    </div>
                                 </div>
                               )
                            })}
                         </div>
                      )}
                      {synthTab === 'upgrade' && (
                         <div className="flex-1 space-y-4"><div className="text-xs text-gray-400 mb-2 italic">右鍵可查看裝備詳細資訊</div><h3 className="text-yellow-500 font-bold mb-1">角色裝備中</h3>{renderBlacksmithGroup(upgradeList.filter(e => e._isEq))}<h3 className="text-yellow-500 font-bold mb-1 mt-6">背包未裝備</h3>{renderBlacksmithGroup(upgradeList.filter(e => !e._isEq))}</div>
                      )}
                      {synthTab === 'dismantle' && (
                         <div className="flex-1 space-y-4"><div className="text-xs text-gray-400 mb-2 italic">點擊圖示以批次選擇分解</div><h3 className="text-yellow-500 font-bold mb-1 mt-2">背包未裝備</h3>{renderBlacksmithGroup(fullList.filter(e => !e._isEq), true)}</div>
                      )}
                      {synthTab === 'refine' && (
                         <div className="flex-1 space-y-4"><div className="text-xs text-gray-400 mb-2 italic">右鍵可查看裝備詳細資訊</div><h3 className="text-yellow-500 font-bold mb-1">角色裝備中</h3>{renderBlacksmithGroup(fullList.filter(e => e._isEq))}<h3 className="text-yellow-500 font-bold mb-1 mt-6">背包未裝備</h3>{renderBlacksmithGroup(fullList.filter(e => !e._isEq))}</div>
                      )}
                      </div>
                   </div>
                   
                   <div className="w-1/2 pl-6">
                      <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 h-full flex flex-col relative">
                          {synthTab === 'dismantle' ? (
                              <div className="flex flex-col h-full">
                                  <h3 className="text-2xl font-bold mb-4 text-orange-400 border-b border-gray-700 pb-2">批次分解裝備</h3>
                                  {dismantleSelections.length > 0 ? (
                                      <>
                                          <p className="text-gray-300">已選擇 <span className="font-bold text-white text-lg">{dismantleSelections.length}</span> 件裝備。</p>
                                          <div className="bg-gray-800 p-4 rounded-lg my-4 flex-1 overflow-y-auto scrollbar-hide">
                                              <h4 className="font-bold text-yellow-300 mb-3 border-b border-gray-600 pb-2">預計獲得冶煉石：</h4>
                                              <div className="space-y-2">
                                                  {RARITY_ORDER.map(r => {
                                                      const count = fullList.filter(e => !e._isEq && dismantleSelections.includes(e.id) && e.rarity === r).length;
                                                      const stoneName = RARITY_MAP[r].name + '強化石';
                                                      const stoneImg = getMatImg(stoneName);
                                                      if(count > 0) return <div key={`yield-${r}`} className={`flex justify-between items-center font-bold ${RARITY_MAP[r].color}`}><div className="flex items-center gap-2">{stoneImg && <img src={stoneImg} className="w-5 h-5 object-contain" alt=""/>}<span>{RARITY_MAP[r].name}強化石</span></div><span>x {count}</span></div>;
                                                      return null;
                                                  })}
                                              </div>
                                          </div>
                                          <div className="mt-auto pt-4 shrink-0">
                                              <button onClick={handleBatchDismantle} className="w-full py-4 bg-red-700 hover:bg-red-600 rounded-lg font-bold text-xl shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"><Hammer size={24}/> 分解已選裝備</button>
                                          </div>
                                      </>
                                  ) : <div className="flex-1 flex items-center justify-center text-gray-500">請在左側點擊欲分解的裝備圖示。</div>}
                              </div>
                          ) : (
                              selectedEq ? (
                                 <>
                                    {synthTab === 'craft' && (
                                       <div className="flex-1 flex flex-col min-h-0">
                                          <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-4">
                                                  {selectedEq.imageUrl && <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={selectedEq.imageUrl} className="w-12 h-12 object-contain" alt=""/>}
                                                  <h3 className="text-3xl font-bold text-orange-400">{TXT(selectedEq.name)}</h3>
                                              </div>
                                              <button onClick={() => showDialog('合成提示', '透過合成有機會隨機獲得 平凡 到 罕見 階級的成品，各項數值也會有隨機波動。')} className="w-8 h-8 rounded-full bg-gray-800 border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 flex items-center justify-center transition-all shadow-md">
                                                  <Info size={16}/>
                                              </button>
                                          </div>
                                          {selectedEq.roles && <div className="text-xs text-red-300 font-bold tracking-widest mb-4 flex items-center gap-1">職階限定: {selectedEq.roles.map((r, ri) => <span key={`rcp-role-${ri}`} className="text-lg">{ROLE_ICONS[r]}</span>)}</div>}
                                          <div className="flex flex-wrap gap-2 mb-4">
                                              {renderAttributeTags(selectedEq.thresholds)}
                                          </div>
                                          <div className="bg-gray-800 p-4 rounded-lg flex-1 overflow-y-auto scrollbar-hide mb-4">
                                             <h4 className="font-bold text-yellow-300 mb-3 border-b border-gray-600 pb-2">所需素材</h4>
                                             <div className="flex flex-col gap-2">
                                                {Object.entries(selectedEq.cost).map(([mat, qty]) => {
                                                   const matName = materialDb[mat]?.name || mat;
                                                   const has = globalStorage.materials[mat] || globalStorage.materials[matName] || 0; 
                                                   return <div key={`req-${mat}`} className={`flex justify-between items-center ${has>=qty?'text-green-400':'text-red-400'}`}><div className="flex items-center gap-2">{getMatData(matName).imageUrl && <img src={getMatData(matName).imageUrl} className="w-5 h-5 object-contain" alt=""/>}<span className={`font-bold ${getMatColorLocal(matName)}`}>{TXT(matName)}</span></div><span>{`${has} / ${qty}`}</span></div>
                                                })}
                                             </div>
                                          </div>
                                          
                                          {/* 新增：指定階級打造區域 */}
                                          <div className="bg-gray-800 p-4 rounded-lg mb-4 border border-gray-700">
                                              <h4 className="font-bold text-orange-300 mb-2 border-b border-gray-600 pb-1">指定打造階級 (選填)</h4>
                                              <p className="text-xs text-gray-400 mb-3">投入對應階級的強化石 1 顆，可必定打造出該階級的裝備。</p>
                                              <select value={targetRarity} onChange={(e) => setTargetRarity(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg p-2.5 outline-none focus:border-orange-500">
                                                  <option value="random">不投入強化石 (隨機階級)</option>
                                                  {RARITY_ORDER.slice(1).map(r => {
                                                      const stoneName = RARITY_MAP[r].name + '強化石';
                                                      const count = globalStorage.refineStones[r] || 0;
                                                      return (
                                                          <option key={`tgt-rarity-${r}`} value={r} disabled={count < 1}>
                                                              消耗 1 {stoneName} 必定打造【{RARITY_MAP[r].name}】(庫存: {count})
                                                          </option>
                                                      )
                                                  })}
                                              </select>
                                          </div>

                                          <div className="mt-auto shrink-0">
                                              <button onClick={()=>handleCraft(selectedEq)} disabled={!checkCost(selectedEq.cost) || (targetRarity !== 'random' && (globalStorage.refineStones[targetRarity] || 0) < 1)} className="w-full py-4 bg-orange-700 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-bold text-xl shadow-lg transition-transform hover:scale-[1.02]">進行合成</button>
                                          </div>
                                       </div>
                                    )}
                                    
                                    {(synthTab === 'upgrade' || synthTab === 'refine') && (
                                       <div className="flex-1 flex flex-col min-h-0">
                                          <div className="flex items-center gap-4 mb-2 pr-24">
                                              {selectedEq.imageUrl && <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={selectedEq.imageUrl} className="w-12 h-12 object-contain" alt=""/>}
                                              <h3 className={`text-3xl font-bold ${RARITY_MAP[selectedEq.rarity].color}`}>{selectedEq.refineLevel > 0 ? `${TXT(selectedEq.name)} +${selectedEq.refineLevel}` : TXT(selectedEq.name)}</h3>
                                          </div>
                                          {selectedEq.allowedRoles && <div className="text-xs text-red-300 font-bold tracking-widest mb-2 flex items-center gap-1">職階限定: {selectedEq.allowedRoles.map((r, ri) => <span key={`sel-role-${ri}`} className="text-lg">{ROLE_ICONS[r]}</span>)}</div>}
                                          <div className="text-sm text-gray-400 mb-4">目前的階級為 <span className={`font-bold ${RARITY_MAP[selectedEq.rarity].color}`}>{RARITY_MAP[selectedEq.rarity].name}</span></div>
                                          <div className="bg-gray-800 p-4 rounded-lg flex-1 overflow-y-auto scrollbar-hide">
                                             <h4 className="font-bold text-yellow-300 mb-3 border-b border-gray-600 pb-2">當前數值</h4>
                                             <div className="text-sm text-gray-300 font-mono space-y-1 mt-2">
                                                {getStatDisplayData(selectedEq.stats, selectedEq.refineBonus).map((st, i) => (
                                                   <div key={`sel-stat-${i}`}>{st.label}+{st.baseStr}{st.bonusStr ? ` (+${st.bonusStr})` : ''}</div>
                                                ))}
                                             </div>
                                             
                                             {synthTab === 'refine' && (
                                                <div className="mt-6 border-t border-gray-600 pt-4">
                                                   <div className="flex justify-between items-center text-sm font-bold">
                                                      <span className="flex items-center gap-2">
                                                         所需 {RARITY_MAP[selectedEq.rarity].name}強化石
                                                         {getMatImg(RARITY_MAP[selectedEq.rarity].name + '強化石') && <img src={getMatImg(RARITY_MAP[selectedEq.rarity].name + '強化石')} className="w-5 h-5 object-contain" alt=""/>}
                                                      </span>
                                                      <span className={(globalStorage.refineStones?.[selectedEq.rarity] || 0) >= (selectedEq.refineLevel >= 9 ? 3 : selectedEq.refineLevel >= 4 ? 2 : 1) ? 'text-green-400' : 'text-red-400'}>{`${globalStorage.refineStones?.[selectedEq.rarity] || 0} / ${selectedEq.refineLevel >= 9 ? 3 : selectedEq.refineLevel >= 4 ? 2 : 1}`}</span>
                                                   </div>
                                                </div>
                                             )}
                                          </div>
                                          
                                          <div className="mt-4 shrink-0">
                                              {synthTab === 'upgrade' && (
                                                  <button onClick={()=>handleUpgrade(selectedEq)} disabled={globalStorage.upgradeStones < 1} className="w-full py-4 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-bold text-xl shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]">{getMatImg('升階石') ? <img src={getMatImg('升階石')} className="w-6 h-6 object-contain" alt=""/> : <ArrowUpCircle size={24}/>} 消耗 1 升階石升階</button>
                                              )}
                                              {synthTab === 'refine' && (
                                                  <button onClick={()=>handleRefine(selectedEq)} disabled={(globalStorage.refineStones?.[selectedEq.rarity] || 0) < (selectedEq.refineLevel >= 9 ? 3 : selectedEq.refineLevel >= 4 ? 2 : 1) || selectedEq.refineLevel >= 12} className="w-full py-4 bg-orange-700 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-bold text-xl shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"><Sparkles size={24}/> {selectedEq.refineLevel >= 12 ? '已達強化上限' : '消耗強化石進行強化'}</button>
                                              )}
                                          </div>
                                       </div>
                                    )}
                                 </>
                              ) : <div className="h-full flex items-center justify-center text-gray-500">請在左側選擇項目檢視詳細資訊</div>
                          )}
                      </div>
                   </div>
                </div>
            )}
         </div>

         {craftedEquipModal && (
            <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setCraftedEquipModal(null)}>
               <div className={`bg-gray-900 border-4 ${RARITY_MAP[craftedEquipModal.rarity].border} rounded-2xl p-8 w-full max-w-sm shadow-[0_0_40px_rgba(255,255,255,0.2)] text-center relative animate-[popIn_0.3s_ease-out_forwards]`} onClick={e => e.stopPropagation()}>
                  <Sparkles size={48} className={`mx-auto mb-4 ${RARITY_MAP[craftedEquipModal.rarity].color}`} />
                  <h3 className="text-2xl font-bold text-white mb-2">打造成功！</h3>
                  {craftedEquipModal.imageUrl && <div className="w-full flex justify-center py-2"><img draggable={false} onDragStart={(e)=>e.preventDefault()} src={craftedEquipModal.imageUrl} className="w-16 h-16 object-contain" alt=""/></div>}
                  <div className={`text-4xl font-black mb-4 ${RARITY_MAP[craftedEquipModal.rarity].color}`}>{TXT(craftedEquipModal.name)}</div>
                  <div className="bg-gray-800 rounded p-4 mb-6">
                     <span className={`inline-block px-3 py-1 bg-gray-950 rounded font-bold mb-4 ${RARITY_MAP[craftedEquipModal.rarity].color}`}>{RARITY_MAP[craftedEquipModal.rarity].name} 裝備</span>
                     <div className="text-sm text-gray-300 font-mono space-y-1">
                        {getStatDisplayData(craftedEquipModal.stats, craftedEquipModal.refineBonus).map((st, i) => (
                           <div key={`craft-st-${i}`}>{st.label}+{st.baseStr}{st.bonusStr ? ` (+${st.bonusStr})` : ''}</div>
                        ))}
                     </div>
                  </div>
                  <button onClick={() => setCraftedEquipModal(null)} className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded font-bold text-white">收下裝備</button>
               </div>
            </div>
         )}

         {materialModalOpen && (() => {
             const groupedMats = {};
             const allMatNames = Array.from(new Set([
                 ...Object.values(materialDb).map(m => m.name || m.id)
             ])).filter(Boolean);

             const validMats = allMatNames.filter(m => {
                 let id = materialDb[m]?.id || Object.values(materialDb).find(dbM => dbM.name === m)?.id;
                 if (!id && (m === '木材' || m === '珂蘿絲石' || m === '陽炎刻印' || m === '滄海刻印' || m === '碧翠刻印' || m === '荒野刻印' || m === '天光刻印' || m === '深影刻印')) return true;
                 if (!id) return false;
                 
                 // 全域掉落 2 個 (木材, 珂蘿絲石 mat072)
                 if (m === '木材' || id === 'mat072' || m === '珂蘿絲石') return true;
                 
                 const idNum = parseInt(id.replace('mat', ''), 10);
                 if (isNaN(idNum)) return false;

                 // 6屬性刻印 (mat057 - mat062)
                 if (idNum >= 57 && idNum <= 62) return true;
                 // 各個地圖的掉落素材共 6x9=54 個 (mat001-mat006, mat009-mat056)
                 if (idNum >= 1 && idNum <= 6) return true;
                 if (idNum >= 9 && idNum <= 56) return true;
                 
                 return false;
             });

             const getManualCategory = (matName) => {
                 let entry = materialDb[matName] || Object.values(materialDb).find(m => m.name === matName || m.id === matName);
                 let id = entry ? entry.id : null;
                 const sigilMap = {'陽炎刻印':'mat057','滄海刻印':'mat058','碧翠刻印':'mat059','荒野刻印':'mat060','天光刻印':'mat061','深影刻印':'mat062'};
                 if (!id && sigilMap[matName]) id = sigilMap[matName];

                 if (id) {
                     const idNum = parseInt(id.replace('mat', ''), 10);
                     if (id === 'mat003' || (idNum >= 9 && idNum <= 16)) return '寧靜之森';
                     if (id === 'mat002' || (idNum >= 17 && idNum <= 24)) return '雪原白地';
                     if (id === 'mat001' || (idNum >= 25 && idNum <= 32)) return '天火熔岩';
                     if (id === 'mat004' || (idNum >= 33 && idNum <= 40)) return '沙暴荒地';
                     if (id === 'mat005' || (idNum >= 41 && idNum <= 48)) return '天空神殿';
                     if (id === 'mat006' || (idNum >= 49 && idNum <= 56)) return '古老遺跡';
                     if (idNum >= 57 && idNum <= 62) return '特殊刻印';
                 }
                 return null;
             };

             validMats.forEach(mat => {
                 const manualSource = getManualCategory(mat);
                 const source = manualSource || getMatSourceLocal(mat) || '未知領域';
                 if (!groupedMats[source]) groupedMats[source] = [];
                 groupedMats[source].push(mat);
             });

             Object.keys(groupedMats).forEach(source => {
                 groupedMats[source].sort((a, b) => {
                     const rA = RARITY_ORDER.indexOf(getMatData(a).rarity);
                     const rB = RARITY_ORDER.indexOf(getMatData(b).rarity);
                     if (rA === rB) {
                         const idA = Object.values(materialDb).find(m => m.name === a)?.id || a;
                         const idB = Object.values(materialDb).find(m => m.name === b)?.id || b;
                         return idA.localeCompare(idB);
                     }
                     return rA - rB;
                 });
             });

             const orderedSources = [
                 '全域素材', '全域掉落', '地下城全域', '寧靜之森', '雪原白地', '天火熔岩', '沙暴荒地', '天空神殿', '古老遺跡', 
                 '特殊刻印'
             ];
             (dungeonList || []).forEach(d => {
                 if (!orderedSources.includes(d.name)) orderedSources.push(d.name);
             });

             const sortedGroupedMats = Object.entries(groupedMats)
                 .filter(([source]) => source !== '未知領域')
                 .sort(([sourceA], [sourceB]) => {
                     let idxA = orderedSources.indexOf(sourceA);
                     let idxB = orderedSources.indexOf(sourceB);
                     if (idxA === -1) idxA = 999;
                     if (idxB === -1) idxB = 999;
                     if (idxA === idxB) return sourceA.localeCompare(sourceB);
                     return idxA - idxB;
                 });

             return (
                 <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setMaterialModalOpen(false)}>
                    <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 w-full max-w-4xl shadow-2xl relative flex flex-col max-h-[85vh] animate-[popIn_0.2s_ease-out_forwards]" onClick={e => e.stopPropagation()}>
                       <button onClick={() => setMaterialModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-900 rounded-full p-1.5 shadow-sm border border-gray-700"><X size={20}/></button>
                       <h3 className="text-2xl font-bold mb-4 text-center text-indigo-400 border-b border-gray-700 pb-3 shrink-0 tracking-widest">素材圖鑑與倉庫</h3>
                       <div className="overflow-y-auto space-y-6 pr-2 scrollbar-hide flex-1 pb-4">
                          {sortedGroupedMats.map(([source, mats]) => (
                              <div key={`source-group-${source}`}>
                                 <h4 className="font-bold text-gray-300 mb-3 flex items-center gap-2"><span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span> {source}</h4>
                                 <div className="grid grid-cols-6 gap-3">
                                    {mats.map(mat => {
                                       const qty = globalStorage.materials[mat] || 0;
                                       const hasItem = qty > 0;
                                       const matData = getMatData(mat);
                                       return (
                                          <div key={`mat-modal-${mat}`} className={`group relative flex flex-col items-center justify-center p-3 bg-gray-900 border-2 ${hasItem ? RARITY_MAP[matData.rarity].border : 'border-gray-700'} rounded-xl shadow-sm aspect-square transition-all ${!hasItem ? 'opacity-40 grayscale' : 'hover:scale-105 hover:border-indigo-400'}`}>
                                             <div className="w-10 h-10 mb-1.5 flex items-center justify-center shrink-0">
                                                {matData.imageUrl ? <img src={matData.imageUrl} draggable={false} onDragStart={(e)=>e.preventDefault()} className="max-w-full max-h-full object-contain drop-shadow-sm" alt=""/> : <span className="text-3xl opacity-60">📦</span>}
                                             </div>
                                             <span className={`text-[11px] font-bold truncate w-full text-center ${hasItem ? getMatColorLocal(mat) : 'text-gray-500'}`}>{TXT(mat)}</span>
                                             <div className={`absolute top-2 right-2 text-[10px] font-black px-1.5 rounded-sm border shadow-sm ${hasItem ? 'bg-gray-800 text-white border-gray-600' : 'bg-gray-900 text-gray-500 border-gray-700'}`}>{qty}</div>
                                             
                                             {!hasItem && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl backdrop-blur-[1px] z-10 pointer-events-none">
                                                    <span className="text-white text-xs font-bold tracking-widest drop-shadow-md">未持有</span>
                                                </div>
                                             )}
                                          </div>
                                       )
                                    })}
                                 </div>
                              </div>
                          ))}
                          {sortedGroupedMats.length === 0 && <div className="text-center text-gray-500 py-10 font-bold">目前尚無任何素材資料。</div>}
                       </div>
                    </div>
                 </div>
             );
         })()}
       </div>
     );
  };

  const renderMiniPartyHUD = (topOffset = 'top-20') => (
      <div className={`absolute ${topOffset} left-6 z-40 flex flex-col gap-2 pointer-events-none`}>
         {partySlots.map((char, idx) => {
             if (!char) return null;
             const mHp = char.maxHpLimit || getStats(char, true, globalStorage.charTiers, globalStorage.charEquips, runState).maxHp;
             const shield = char.baseStats.shield || 0;
             const totalBarCapacity = mHp + shield;
             const hpPctOfTotal = (char.baseStats.hp / totalBarCapacity) * 100;
             const shieldPctOfTotal = (shield / totalBarCapacity) * 100;
             const hpPctForColor = char.baseStats.hp / mHp;
             return (
                 <div key={`hud-${idx}`} className="bg-gray-900/80 border border-gray-700 rounded-lg p-2 flex items-center gap-3 w-48 shadow-lg backdrop-blur-sm pointer-events-auto">
                    <div className="w-10 h-10 bg-gray-950 rounded-full border border-gray-600 flex items-center justify-center shrink-0">
                       <img src={getRoleIconUrl(char.role, char.element)} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-6 h-6 object-contain" alt="" onError={(e)=>{e.target.style.display='none'}}/>
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="text-xs font-bold text-gray-200 truncate mb-1">{TXT(char.name)}</div>
                       <div className="flex items-center gap-1">
                          <div className="text-[9px] text-gray-500 w-3">HP</div>
                          <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden flex relative">
                             <div className={`h-full ${hpPctForColor < 0.2 ? 'bg-red-500' : hpPctForColor < 0.5 ? 'bg-orange-500' : 'bg-green-500'}`} style={{width: `${Math.max(0, Math.min(100, hpPctOfTotal))}%`}}></div>
                             {shield > 0 && <div className="h-full bg-white transition-all absolute right-0" style={{width: `${Math.max(0, Math.min(100, shieldPctOfTotal))}%`}}></div>}
                          </div>
                       </div>
                       <div className="flex items-center gap-1 mt-1">
                          <div className="text-[9px] text-gray-500 w-3">EP</div>
                          <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden">
                             <div className="bg-yellow-500 h-full" style={{width: `${char.energy}%`}}></div>
                          </div>
                       </div>
                    </div>
                 </div>
             );
         })}
      </div>
  );

  const renderMap = () => {
    const safeDList = Array.isArray(dungeonList) && dungeonList.length > 0 ? dungeonList : [{ id: 'forest', name: '未知地下城', iconName: 'Mountain' }];
    const dungeon = safeDList.find(d => d.id === runDungeon) || safeDList[0];
    const IconCmp = { TreePine, Target, Flame, Sun, Moon, Sparkles, Mountain }[dungeon.iconName] || Mountain;
    return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-white relative">
      {dungeon.mapBgUrl && <img src={dungeon.mapBgUrl} draggable={false} onDragStart={(e)=>e.preventDefault()} className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none" alt="" />}

      <div className="absolute inset-0 overflow-y-auto scrollbar-hide pt-24 pb-24 px-32" ref={mapScrollRef}>
         <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>
         <div className="relative w-full h-[1080px]">
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
               {mapGraph && mapGraph.flatMap(layer => layer.nodes.flatMap(node => node.parents.map(pId => {
                  let parentLayer = mapGraph.find(l => l.level === layer.level - 1);
                  if(!parentLayer) return null;
                  let parentNode = parentLayer.nodes.find(n => n.id === pId);
                  if(!parentNode) return null;
                  
                  let lineActive = false;
                  let isPast = parseInt(node.id.split('-')[0]) < parseInt(activeNodes[0]?.split('-')[0] || 999);
                  if (currentNodeInfo && currentNodeInfo.id === node.id && currentNodeInfo.parents.includes(pId)) lineActive = true;
                  else if (isPast && activeNodes.includes(node.id)) lineActive = true;

                  return (
                     <line 
                        key={`line-${pId}-${node.id}`} 
                        x1={`${parentNode.x}%`} y1={parentNode.y + 28} 
                        x2={`${node.x}%`} y2={node.y + 28} 
                        stroke={lineActive ? '#eab308' : '#374151'} 
                        strokeWidth={lineActive ? 4 : 2}
                        opacity={isPast && !lineActive ? 0.3 : 1}
                     />
                  );
               })))}
            </svg>

            {mapGraph && mapGraph.map((layer) => (
                <div key={`layer-${layer.level}`} className={`absolute w-full left-0 flex justify-center ${activeNodes.some(id => layer.nodes.map(n=>n.id).includes(id)) ? 'active-node-layer' : ''}`} style={{top: layer.nodes[0].y}}>
                   {layer.nodes.map(node => {
                       const isActive = activeNodes.includes(node.id);
                       const isPast = parseInt(node.id.split('-')[0]) < parseInt(activeNodes[0]?.split('-')[0] || 999);
                       let icon = <Shield size={24} />; let color = 'bg-gray-600'; let border = 'border-gray-500';
                       
                       if (node.type === 'battle') { icon = <Sword size={20} />; color = 'bg-red-900'; border = 'border-red-700'; }
                       else if (node.type === 'elite') { icon = <Skull size={24} />; color = 'bg-red-700'; border = 'border-red-500 text-white'; }
                       else if (node.type === 'boss') { icon = <Skull size={32} />; color = 'bg-purple-900'; border = 'border-purple-500 text-purple-200'; }
                       else if (node.type === 'shop') { icon = <Store size={20} />; color = 'bg-yellow-700'; border = 'border-yellow-500 text-yellow-100'; }
                       else if (node.type === 'camp') { icon = <Tent size={20} />; color = 'bg-green-700'; border = 'border-green-500 text-green-100'; }
                       else if (node.type === 'event') { icon = <Info size={20} />; color = 'bg-blue-800'; border = 'border-blue-500 text-blue-100'; }

                       return (
                           <div 
                              key={node.id}
                              onClick={() => isActive && enterNode(node)}
                              className={`absolute -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center border-4 z-10 transition-all ${color} ${border} ${isActive ? 'cursor-pointer scale-110 shadow-[0_0_20px_rgba(255,255,255,0.5)] animate-pulse' : 'opacity-50 grayscale'}`}
                              style={{ left: `${node.x}%` }}
                           >
                              {icon}
                           </div>
                       );
                   })}
                </div>
            ))}
         </div>
      </div>

      <div className="absolute top-6 left-6 z-50 flex flex-col gap-2">
         <button onClick={() => { setPrevScreen('map'); setEqFilter('all'); setScreen('synthesis'); setSynthesisTab('equip'); }} className="px-5 py-3 bg-gray-900/90 border-2 border-gray-700 hover:border-blue-500 rounded-xl font-bold flex items-center gap-3 backdrop-blur-sm transition-all shadow-lg text-lg">
            <Backpack size={20}/> 隊伍狀態與裝備
         </button>
      </div>

      {renderMiniPartyHUD('top-24')}

      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 text-center bg-gray-900/90 px-8 py-3 rounded-full border-2 border-gray-700 backdrop-blur-sm shadow-xl flex flex-col items-center">
         <h2 className="text-2xl font-black flex items-center justify-center gap-3 tracking-widest"><IconCmp className={dungeon.iconColor} size={28}/> {TXT(dungeon.name)} <span className="text-yellow-500 ml-2">第 {floor} 層</span></h2>
         {runDungeonLevel > 0 && <span className="text-xs text-yellow-500 font-bold mt-1 tracking-widest">{['', '異變', '崩壞', '終末'][runDungeonLevel]} 挑戰中</span>}
      </div>

      <div className="absolute top-6 right-6 z-50 flex flex-col items-end gap-3">
         <div className="bg-gray-900/90 border-2 border-yellow-600/50 px-6 py-2 rounded-full flex items-center gap-2 font-bold text-yellow-400 backdrop-blur-sm shadow-lg text-xl"><GoldIcon size={20}/> {gold}</div>
         <button onClick={handleReturnToTown} className="px-5 py-2 bg-red-900/80 hover:bg-red-800 border border-red-700 rounded-lg font-bold text-red-200 text-sm backdrop-blur-sm shadow-lg transition-colors">放棄探索</button>
      </div>
    </div>
    );
  };

  const renderCamp = () => (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-950 text-white items-center justify-center relative p-6">
      <div className="absolute inset-0 bg-orange-900/20 z-0 pointer-events-none"></div>
      <Tent size={100} className="mb-8 text-orange-500 drop-shadow-[0_0_30px_rgba(249,115,22,0.6)] relative z-10" />
      <h2 className="text-4xl font-bold mb-12 text-orange-400 relative z-10 tracking-widest">營地休息</h2>
      <div className="flex gap-6 relative z-10">
        <button onClick={() => {
           const recPct = [0.25, 0.20, 0.15, 0.10][runDungeonLevel] || 0.25;
           const epRecPct = [15, 10, 10, 5][runDungeonLevel] || 15;
           let newParty = [...partySlots];
           newParty.forEach(p => { 
               if(p && p.baseStats.hp > 0) {
                   p.baseStats.hp = Math.min(getStats(p, true, globalStorage.charTiers, globalStorage.charEquips, runState).maxHp, p.baseStats.hp + Math.floor(getStats(p, true, globalStorage.charTiers, globalStorage.charEquips, runState).maxHp * recPct)); 
                   p.energy = Math.min(100, (p.energy || 0) + epRecPct);
               }
           });
           setPartySlots(newParty);
           showDialog('休息', `全體回復 ${Math.floor(recPct*100)}% 最大生命值與 ${epRecPct} 點 EP！`, 'alert', () => setScreen('map'));
        }} className="w-56 h-40 bg-green-700 hover:bg-green-600 rounded-xl font-bold text-xl shadow-lg flex flex-col items-center justify-center gap-3 transition-transform hover:-translate-y-1 border border-green-600">
           <Heart size={36}/>
           <span>休息</span>
           <div className="text-xs text-green-200 font-normal">回復生命與 EP</div>
        </button>

        <button onClick={() => {
           let r = 'uncommon';
           if (floor === 1) r = Math.random() < 0.2 ? 'uncommon' : 'rare';
           else if (floor === 2) r = Math.random() < 0.2 ? 'epic' : 'uncommon';
           else if (floor === 3) r = Math.random() < 0.2 ? 'mythic' : 'legendary';

           let newEq1 = generateEquip(floor, equipRecipes, r);
           let newEq2 = generateEquip(floor, equipRecipes, r);
           setGlobalStorage(prev => ({...prev, equips: [...prev.equips, newEq1, newEq2]}));
           
           showDialog('鍛造', '你利用營火成功打造了裝備！(已放入全局倉庫)', 'alert', () => setScreen('map'), { equips: [newEq1, newEq2] });
        }} className="w-56 h-40 bg-blue-700 hover:bg-blue-600 rounded-xl font-bold text-xl shadow-lg flex flex-col items-center justify-center gap-3 transition-transform hover:-translate-y-1 border border-blue-600">
           <Hammer size={36}/>
           <span>鍛造</span>
           <div className="text-xs text-blue-200 font-normal">隨機鍛造 2 件裝備</div>
        </button>

        <button onClick={() => {
           const currentDungeonData = dungeonList.find(d => d.id === runDungeon);
           const rawRestMat = currentDungeonData?.restmat;
           
           const poolByRarity = { common: [], uncommon: [], rare: [], legendary: [], epic: [], mythic: [] };
           let dungeonMatPool = [];
           
           // 判斷 restmat 是否為按稀有度分類的物件結構
           if (rawRestMat && typeof rawRestMat === 'object' && !Array.isArray(rawRestMat)) {
               Object.entries(rawRestMat).forEach(([rarityKey, ids]) => {
                   if (poolByRarity[rarityKey] && Array.isArray(ids)) {
                       ids.forEach(id => {
                           let matData = materialDb[id] || Object.values(materialDb).find(m => m.id === id || m.name === id) || { name: id, rarity: rarityKey };
                           poolByRarity[rarityKey].push(matData);
                           dungeonMatPool.push(matData);
                       });
                   }
               });
           } else {
               // 兼容舊版設定 (字串或陣列)
               let restMatIds = Array.isArray(rawRestMat) ? rawRestMat : (typeof rawRestMat === 'string' ? [rawRestMat] : []);
               
               if (restMatIds.length === 0 && currentDungeonData?.dungeonLoot) {
                   restMatIds = currentDungeonData.dungeonLoot.map(item => typeof item === 'string' ? item : (item.id || item.name));
               }
               
               restMatIds.forEach(id => {
                   let matData = materialDb[id] || Object.values(materialDb).find(m => m.id === id || m.name === id);
                   if (!matData) {
                       matData = { name: id, rarity: 'common' };
                   }
                   dungeonMatPool.push(matData);
                   const rarity = matData.rarity || 'common';
                   if (poolByRarity[rarity]) {
                       poolByRarity[rarity].push(matData);
                   }
               });
           }
           
           // 最後的安全防線，保證一定有東西可以抽
           if (dungeonMatPool.length === 0) {
               dungeonMatPool.push({ name: '木材', rarity: 'common' });
               poolByRarity['common'].push({ name: '木材', rarity: 'common' });
           }

           const dropRules = {
               0: { common: 2, uncommon: 2, rare: 1, legendary: 0, epic: 0, mythic: 0 },
               1: { common: 3, uncommon: 3, rare: 2, legendary: 1, epic: 0, mythic: 0 },
               2: { common: 4, uncommon: 4, rare: 2, legendary: 2, epic: 0, mythic: 0 },
               3: { common: 5, uncommon: 5, rare: 3, legendary: 3, epic: 1, mythic: 0 }
           };
           const rules = dropRules[runDungeonLevel] || dropRules[0];
           let gained = [];

           for (let rarity in rules) {
               let count = rules[rarity];
               if (count > 0) {
                   let availableMats = poolByRarity[rarity];
                   
                   // 若該地圖沒有對應稀有度的素材，往低階的同地圖素材尋找替代
                   if (!availableMats || availableMats.length === 0) {
                       const rIndex = RARITY_ORDER.indexOf(rarity);
                       for(let i = rIndex - 1; i >= 0; i--) {
                           if (poolByRarity[RARITY_ORDER[i]] && poolByRarity[RARITY_ORDER[i]].length > 0) {
                               availableMats = poolByRarity[RARITY_ORDER[i]];
                               break;
                           }
                       }
                   }
                   
                   // 如果還是沒有，給個木材墊底
                   if (!availableMats || availableMats.length === 0) {
                       availableMats = [{ name: '木材', rarity: 'common' }];
                   }

                   // 獨立抽取機制：每次抽選都是從陣列中隨機拿一個 (支援抽出同樣的素材)
                   for (let i = 0; i < count; i++) {
                       let picked = availableMats[Math.floor(Math.random() * availableMats.length)];
                       let matName = picked.name || picked.id;
                       let existing = gained.find(g => g.name === matName);
                       if (existing) {
                           existing.qty += 1;
                       } else {
                           gained.push({ name: matName, qty: 1, rarity: picked.rarity || 'common', imageUrl: picked.imageUrl || getMatImg(matName) });
                       }
                   }
               }
           }

           if (gained.length === 0) {
               let fallback = dungeonMatPool[0] || { name: '木材', rarity: 'common' };
               gained.push({ name: fallback.name, qty: 1, rarity: fallback.rarity || 'common', imageUrl: fallback.imageUrl || getMatImg(fallback.name) });
           }

           setGlobalStorage(prev => {
               let newMats = { ...prev.materials };
               gained.forEach(item => {
                   newMats[item.name] = (newMats[item.name] || 0) + item.qty;
               });
               return { ...prev, materials: newMats };
           });
           setMatsGainedThisRun(prev => {
               let newRunMats = { ...prev };
               gained.forEach(item => {
                   newRunMats[item.name] = (newRunMats[item.name] || 0) + item.qty;
               });
               return newRunMats;
           });

           showDialog('探索', `在營地周圍探索，獲得了以下素材：`, 'alert', () => setScreen('map'), { mats: gained });
        }} className="w-56 h-40 bg-purple-700 hover:bg-purple-600 rounded-xl font-bold text-xl shadow-lg flex flex-col items-center justify-center gap-3 transition-transform hover:-translate-y-1 border border-purple-600">
           <TreePine size={36}/>
           <span>探索</span>
           <div className="text-xs text-purple-200 font-normal">採集附近環境素材</div>
        </button>
      </div>
    </div>
  );

  const renderShop = () => {
    const handleBuy = (item, isEq) => {
       if (gold < item.price) return showDialog(`${goldName}不足`, `你沒有足夠的${goldName}購買此物品。`);
       if (isEq && item.id === 'evt_stone') {
           setGold(g => g - item.price);
           setGlobalStorage(p => ({...p, evolutionStones: p.evolutionStones + 1}));
           setRunState(p => ({...p, evoStoneBought: true}));
           setShopEquips(prev => prev.map(e => e.id === 'evt_stone' ? {...e, soldOut: true} : e));
           showDialog('購買成功', '獲得了 1 顆進化石！');
           return;
       }
       setGold(g => g - item.price);
       if (isEq) {
           setGlobalStorage(p => ({...p, equips: [...p.equips, item]}));
           setShopEquips(prev => prev.map(e => e.id === item.id ? {...e, soldOut: true} : e));
       } else {
           setRunItems(prev => [...prev, item]);
           setShopItems(prev => prev.map(i => i.instanceId === item.instanceId ? {...i, soldOut: true} : i));
       }
    };

    const handleRefreshPart = (type, advanced = false) => {
        const cost = advanced ? 100 : 50;
        if (gold < cost) return showDialog(`${goldName}不足`, `需要 ${cost} ${goldName}才能進行刷新。`);
        
        const hasRefreshable = shopEquips.some(eq => !eq.soldOut && eq.type === type && eq.id !== 'evt_stone');
        if (!hasRefreshable) return showDialog('無法刷新', '該部位已無可刷新的未售出裝備！');

        const preservedNames = new Set();
        // 將商店目前出現過的所有裝備名稱列入排除名單，確保不會刷出重複的裝備
        shopEquips.forEach(eq => preservedNames.add(eq.name));

        const updatedEqs = shopEquips.map(eq => {
            if (eq.soldOut || eq.type !== type || eq.id === 'evt_stone') return eq;
            
            let targetRarity = eq.rarity;
            if (advanced) {
                const currentIdx = RARITY_ORDER.indexOf(eq.rarity);
                if (currentIdx < RARITY_ORDER.length - 1) {
                    targetRarity = RARITY_ORDER[currentIdx + 1];
                }
            }
            
            return generateUniqueEquip(floor, equipRecipes, targetRarity, type, preservedNames);
        });

        setGold(g => g - cost);
        setShopEquips(updatedEqs);
        setShopRefreshes(prev => ({ ...prev, [type]: true }));
        
        const typeNameMap = {'weapon': '武器', 'head': '頭部', 'body': '身體', 'shoes': '腳部', 'accessory': '飾品'};
        showDialog('刷新成功', advanced ? `已成功對未售出的【${typeNameMap[type]}】進行高級刷新，替換之裝備階級提升一階！` : `已成功對未售出的【${typeNameMap[type]}】進行普通刷新！`);
    };

    const handleSellMat = (matName, count) => {
        let price = MAT_PRICES[getMatData(matName).rarity] * count;
        setGold(g => g + price);
        setGlobalStorage(prev => {
            let newMats = {...prev.materials};
            newMats[matName] -= count;
            return {...prev, materials: newMats};
        });
        showDialog('出售成功', `賣出了 ${matName} x${count}，獲得 ${price} ${goldName}。`);
    };

    const handleSellEq = (eq) => {
        let price = Math.floor(eq.price * 0.7);
        setGold(g => g + price);
        setGlobalStorage(prev => ({...prev, equips: prev.equips.filter(e => e.id !== eq.id)}));
        showDialog('出售成功', `賣出了 [${eq.name}]，獲得 ${price} ${goldName}。`);
    };

    return (
      <div className="flex flex-col h-screen overflow-hidden bg-gray-950 text-white p-6 relative">
        <button onClick={() => setScreen('map')} className="absolute top-6 left-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded font-bold flex items-center gap-2"><ArrowRight size={18} className="rotate-180"/>離開商店</button>
        <button onClick={() => { setPrevScreen('shop'); setEqFilter('all'); setScreen('synthesis'); setSynthesisTab('equip'); }} className="absolute top-6 left-40 px-4 py-2 bg-indigo-800 hover:bg-indigo-700 rounded font-bold flex items-center gap-2"><Backpack size={18}/>檢視背包與裝備</button>
        <div className="absolute top-6 right-6 bg-gray-900 border border-gray-700 px-6 py-2 rounded-full flex items-center gap-2 font-bold text-yellow-400">
           <GoldIcon size={20}/> {goldName}: {gold}
        </div>
        
        <div className="flex justify-center items-center gap-4 mb-8 mt-2"><Store size={40} className="text-yellow-500"/><h2 className="text-4xl font-bold">神秘商店</h2></div>
        
        <div className="flex justify-center gap-4 mb-8">
           <button onClick={()=>setShopTab('buy_item')} className={`px-8 py-3 rounded-full font-bold text-lg transition-colors ${shopTab==='buy_item'?'bg-yellow-600 text-white shadow-lg':'bg-gray-900 text-gray-500'}`}>購買商店</button>
           <button onClick={()=>setShopTab('sell_eq')} className={`px-8 py-3 rounded-full font-bold text-lg transition-colors ${shopTab==='sell_eq'?'bg-blue-600 text-white shadow-lg':'bg-gray-900 text-gray-500'}`}>出售介面</button>
        </div>

        <div className="max-w-6xl mx-auto w-full flex-1 overflow-y-auto scrollbar-hide pr-2">
           {shopTab === 'buy_item' && (
              <>
                 <h3 className="text-xl font-bold text-yellow-500 mb-4 border-b border-gray-700 pb-2">消耗品與特殊道具</h3>
                 <div className="grid grid-cols-2 gap-4 mb-8">
                    {shopItems.map((item, idx) => {
                       if (item.soldOut) return (
                           <div key={`shop-item-${idx}`} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center opacity-50 grayscale">
                              <div>
                                  <div className={`font-bold text-lg mb-1 ${RARITY_MAP[item.rarity].color}`}>
                                    <div className="flex items-center gap-2">
                                       {item.imageUrl && <img src={item.imageUrl} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-12 h-12 object-contain" alt=""/>}
                                       <span>{TXT(item.name)}</span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-400">{TXT(item.desc)}</div>
                              </div>
                              <button disabled className="px-4 py-2 bg-gray-800 rounded-lg font-bold text-gray-600">售罄</button>
                           </div>
                       );
                       return (
                           <div key={`shop-item-${idx}`} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center shadow-lg transition-transform hover:scale-[1.02]">
                              <div>
                                  <div className={`font-bold text-lg mb-1 ${RARITY_MAP[item.rarity].color}`}>
                                    <div className="flex items-center gap-2">
                                       {item.imageUrl && <img src={item.imageUrl} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-12 h-12 object-contain" alt=""/>}
                                       <span>{TXT(item.name)}</span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-400">{TXT(item.desc)}</div>
                              </div>
                              <button onClick={() => handleBuy(item, false)} disabled={gold < item.price} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-gray-700 shadow-md transition-colors ${gold < item.price ? 'text-gray-500 bg-gray-800 cursor-not-allowed opacity-50' : 'bg-gray-800 hover:bg-gray-700 text-yellow-400'}`}>
                                  {item.price} <GoldIcon size={16}/>
                              </button>
                           </div>
                       )
                    })}
                 </div>
                 
                 <h3 className="text-xl font-bold text-yellow-500 mb-4 border-b border-gray-700 pb-2">裝備清單</h3>
                 <div className="flex flex-wrap gap-2 pb-4 justify-between">
                    {[...EQ_TYPES, 'stone'].map(type => {
                       const equipsOfType = shopEquips.filter(e => type === 'stone' ? e.id === 'evt_stone' : e.type === type);
                       if (equipsOfType.length === 0) return null;
                       
                       // 檢查此部位下的商品是否全部售罄
                       const isAllSoldOut = type !== 'stone' && equipsOfType.every(eq => eq.soldOut);
                       const hasAdvanced = currentNodeInfo?.type === 'event';

                       return (
                          <div key={`shop-grp-${type}`} className={`flex-1 min-w-[140px] ${hasAdvanced ? 'h-[240px]' : 'h-[205px]'} bg-gray-800/60 border border-gray-700 rounded-xl p-3 flex flex-col items-center justify-between shadow-sm transition-all`}>
                             <div className="flex flex-col items-center w-full gap-2">
                                 <div className="flex items-center gap-1.5 text-gray-400 font-bold text-xs border-b border-gray-700 pb-1 w-full justify-center">
                                    <span className="opacity-70 drop-shadow-md">{type === 'stone' ? '💎' : EQ_MINI_ICONS[type]}</span>
                                    <span>{type === 'stone' ? '特殊' : type === 'weapon' ? '武器' : type === 'head' ? '頭部' : type === 'body' ? '身體' : type === 'shoes' ? '腳部' : '飾品'}</span>
                                 </div>
                                 <div className="flex gap-2 w-full justify-center h-[72px] items-start">
                                    {equipsOfType.map((item, idx) => {
                                       if (item.soldOut) return (
                                           <div key={`shop-eq-${item.id || idx}`} className="flex flex-col items-center gap-1 w-14 h-[72px] justify-start">
                                               <div className="w-14 h-14 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-center opacity-50 grayscale shadow-inner">
                                                  <span className="text-[10px] font-bold text-gray-600">售罄</span>
                                               </div>
                                           </div>
                                       );
                                       const isStone = item.type === 'stone';
                                       return (
                                       <div key={`shop-eq-${item.id || idx}`} className="flex flex-col items-center gap-0.5 w-14 h-[72px] justify-start">
                                           <div
                                              onMouseEnter={(e) => handleTooltipOpen(e, isStone ? 'stone' : 'equip', item)}
                                              onMouseMove={handleTooltipMove} onMouseLeave={handleTooltipClose}
                                              onClick={() => { if(gold >= item.price) { handleBuy(item, true); handleTooltipClose(); } }}
                                              className={`relative w-14 h-14 border-2 rounded-xl flex items-center justify-center transition-all ${RARITY_MAP[item.rarity].bg} ${RARITY_MAP[item.rarity].border} cursor-pointer shadow-md hover:scale-110 hover:border-yellow-400 hover:z-10 ${gold < item.price ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
                                              {item.imageUrl ? (
                                                 <img src={item.imageUrl} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-full h-full object-contain p-1" alt={item.name} />
                                              ) : (
                                                 <span className="opacity-70 text-xl pointer-events-none">{isStone ? '💎' : {'weapon': '⚔️', 'head': '🪖', 'body': '👕', 'shoes': '🥾', 'accessory': '💍'}[item.type]}</span>
                                              )}
                                              {item.refineLevel > 0 && <div className="absolute bottom-0 right-0 bg-black/80 text-white text-[9px] font-bold px-1 rounded-tl-md rounded-br-lg border-t border-l border-gray-600 pointer-events-none">+{item.refineLevel}</div>}
                                           </div>
                                           <div className={`text-[10px] font-bold flex items-center gap-0.5 ${gold < item.price ? 'text-gray-500' : 'text-yellow-400 drop-shadow-sm'}`}>
                                               {item.price} <GoldIcon size={8}/>
                                           </div>
                                       </div>
                                       )
                                    })}
                                 </div>
                             </div>
                             {type !== 'stone' ? (
                                 <div className={`flex flex-col justify-end gap-1 w-full mt-2 border-t border-gray-700 pt-2 px-1 ${hasAdvanced ? 'h-[64px]' : 'h-[32px]'}`}>
                                     <button 
                                         onClick={() => handleRefreshPart(type, false)} 
                                         disabled={shopRefreshes[type] || gold < 50 || isAllSoldOut} 
                                         className={`w-full py-1.5 rounded text-[10px] font-bold transition-all shadow-sm ${shopRefreshes[type] || isAllSoldOut ? 'bg-gray-800 text-gray-600 border-gray-800 cursor-not-allowed' : 'bg-yellow-700/80 hover:bg-yellow-600 text-white border border-yellow-600/30'}`}
                                     >
                                         {shopRefreshes[type] ? '已刷新' : isAllSoldOut ? '已售罄' : '普通刷新 (50)'}
                                     </button>
                                     {hasAdvanced && (
                                         <button 
                                             onClick={() => handleRefreshPart(type, true)} 
                                             disabled={shopRefreshes[type] || gold < 100 || isAllSoldOut} 
                                             className={`w-full py-1.5 rounded text-[10px] font-bold transition-all shadow-sm mt-0.5 ${shopRefreshes[type] || isAllSoldOut ? 'bg-gray-800 text-gray-600 border-gray-800 cursor-not-allowed' : 'bg-purple-700/80 hover:bg-purple-600 text-white border border-purple-500/30'}`}
                                         >
                                             {shopRefreshes[type] ? '已刷新' : isAllSoldOut ? '已售罄' : '✨高級刷新 (100)'}
                                         </button>
                                     )}
                                 </div>
                             ) : (
                                 <div className={`w-full ${hasAdvanced ? 'h-[64px]' : 'h-[32px]'}`} />
                             )}
                          </div>
                       )
                    })}
                 </div>
              </>
           )}

           {shopTab === 'sell_eq' && (
              <>
                 <h3 className="text-xl font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2">出售裝備 (70%售價)</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {globalStorage.equips.sort((a,b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)).map((eq, idx) => (
                       <div key={`sell-eq-${eq.id}`} className={`bg-gray-900 border-2 p-3 rounded-xl flex flex-col justify-between shadow-lg ${RARITY_MAP[eq.rarity].bg} ${RARITY_MAP[eq.rarity].border}`}>
                          <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                                  {eq.imageUrl ? (
                                      <img src={eq.imageUrl} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-full h-full object-contain p-1" alt="" />
                                  ) : (
                                      <div className="text-2xl opacity-60">{'weapon'===eq.type?'⚔️':eq.type==='head'?'🪖':eq.type==='body'?'👕':eq.type==='shoes'?'🥾':'💍'}</div>
                                  )}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className={`font-bold text-sm mb-1 truncate text-white`}>{eq.refineLevel > 0 ? `${TXT(eq.name)} +${eq.refineLevel}` : TXT(eq.name)}</div>
                                  <div className="text-[9px] text-gray-300 font-mono line-clamp-2 leading-tight">{getInlineStatString(eq)}</div>
                              </div>
                          </div>
                          <button onClick={() => handleSellEq(eq)} className="w-full py-2 bg-gray-800 hover:bg-red-900 rounded-lg font-bold flex items-center justify-center gap-1.5 text-gray-300 border border-gray-700 shadow-md transition-colors text-xs mt-auto">
                              賣出 +{Math.floor(eq.price * 0.7)} <GoldIcon size={12}/>
                          </button>
                       </div>
                    ))}
                    {globalStorage.equips.length === 0 && <div className="col-span-full text-center text-gray-500 py-6 font-bold">背包中沒有可出售的裝備</div>}
                 </div>

                 <h3 className="text-xl font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2">出售素材</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(globalStorage.materials).filter(([m,q])=>q>0).sort((a,b)=>RARITY_ORDER.indexOf(getMatData(a[0]).rarity) - RARITY_ORDER.indexOf(getMatData(b[0]).rarity)).map(([mat, qty]) => {
                        let unitPrice = MAT_PRICES[getMatData(mat).rarity];
                        return (
                           <div key={`sell-mat-${mat}`} className="bg-gray-900 border border-gray-700 rounded-xl flex shadow-lg overflow-hidden h-24">
                              <div className="w-20 bg-gray-800 border-r border-gray-700 shrink-0 flex items-center justify-center p-2">
                                  {getMatData(mat).imageUrl ? <img src={getMatData(mat).imageUrl} className="w-full h-full object-contain drop-shadow-md" alt=""/> : <div className="text-3xl opacity-60">📦</div>}
                              </div>
                              <div className="flex-1 p-2.5 flex flex-col justify-between min-w-0">
                                  <div className="flex flex-col mb-1">
                                      <span className={`font-bold text-sm truncate ${getMatColorLocal(mat)}`}>{TXT(mat)}</span>
                                      <span className="text-[10px] text-gray-400 font-bold">持有: <span className="text-white">{qty}</span></span>
                                  </div>
                                  <div className="flex gap-1.5 mt-auto">
                                      <button onClick={() => handleSellMat(mat, 1)} className="flex-1 py-1 bg-gray-800 hover:bg-gray-700 rounded font-bold text-[10px] text-gray-300 border border-gray-600 transition-colors shadow-sm whitespace-nowrap">
                                          賣1 (+{unitPrice})
                                      </button>
                                      <button onClick={() => handleSellMat(mat, qty)} className="flex-1 py-1 bg-gray-800 hover:bg-red-900 rounded font-bold text-[10px] text-white border border-gray-600 transition-colors shadow-sm whitespace-nowrap">
                                          全賣 (+{unitPrice * qty})
                                      </button>
                                  </div>
                              </div>
                           </div>
                        )
                    })}
                    {Object.keys(globalStorage.materials).every(k=>globalStorage.materials[k]===0) && <div className="col-span-full text-center text-gray-500 py-6 font-bold">背包中沒有可出售的素材</div>}
                 </div>
              </>
           )}
        </div>
      </div>
    );
  };

  const renderEvent = () => (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-950 text-white items-center justify-center relative p-6">
      <div className="absolute inset-0 bg-blue-900/10 z-0 pointer-events-none"></div>
      <Info size={80} className="mb-8 text-blue-400 drop-shadow-[0_0_30px_rgba(96,165,250,0.6)] relative z-10" />
      <h2 className="text-4xl font-bold mb-6 relative z-10 tracking-wider">{TXT(eventData?.title)}</h2>
      <p className="text-xl text-gray-300 mb-12 max-w-2xl text-center leading-relaxed relative z-10">{TXT(eventData?.desc)}</p>
      
      {!eventData?.selectionMode ? (
          <div className="flex gap-6 relative z-10">
               <button onClick={() => setScreen('map')} className="px-8 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-bold text-xl transition-all hover:scale-105 shadow-lg">
                  繼續前進
               </button>
          </div>
      ) : (
          <div className="relative z-10 w-full max-w-3xl">
              <h3 className="text-center text-yellow-400 font-bold mb-6 text-xl">選擇一名角色接受賜福：</h3>
              <div className="grid grid-cols-4 gap-4">
                  {partySlots.map((char, idx) => {
                      if(!char) return null;
                      const tier = globalStorage.charTiers[char.id] || 0;
                      const canBless = tier < 5;
                      return (
                          <div key={`god-char-${idx}`} onClick={() => canBless && handleGodBless(idx)} className={`bg-gray-900 border-2 rounded-xl p-4 flex flex-col items-center text-center transition-all ${canBless ? 'border-yellow-500/50 cursor-pointer hover:border-yellow-400 hover:scale-105 hover:bg-gray-800 shadow-[0_0_15px_rgba(250,204,21,0.2)]' : 'border-gray-700 opacity-50 grayscale'}`}>
                             {getActiveCharImg(char) ? <img src={getActiveCharImg(char)} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-16 h-16 rounded-full object-cover object-top mb-3 border-2 border-gray-700" alt={char.name}/> : <span className={`text-4xl mb-3 ${ELEMENT_COLORS[char.element]}`}>{ROLE_ICONS[char.role]}</span>}
                             <div className={`font-bold text-sm mb-1 ${RARITY_MAP[RARITY_ORDER[tier]].color}`}>{TXT(char.name)}</div>
                             <div className="text-[10px] text-gray-400 bg-gray-950 px-2 py-0.5 rounded">{RARITY_MAP[RARITY_ORDER[tier]].name}</div>
                             {!canBless && <div className="text-red-400 text-xs font-bold mt-2">已達上限</div>}
                          </div>
                      );
                  })}
              </div>
          </div>
      )}
    </div>
  );

  const renderBattle = () => {
    const safeDList = Array.isArray(dungeonList) && dungeonList.length > 0 ? dungeonList : [{ id: 'forest', name: '未知地下城', iconName: 'Mountain' }];
    const dungeon = safeDList.find(d => d.id === runDungeon) || safeDList[0];
    if (!battleState) return null;
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-gray-950 text-white relative font-sans">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes floatUpFadeOut {
             0% { transform: translateY(0) scale(1); opacity: 1; }
             100% { transform: translateY(-50px) scale(1.2); opacity: 0; }
          }
          .animate-float-up-fade { animation: floatUpFadeOut 1.2s ease-out forwards; }
          @keyframes flashWhite {
             0% { filter: brightness(1); }
             50% { filter: brightness(2) drop-shadow(0 0 10px white); }
             100% { filter: brightness(1); }
          }
          .animate-flash { animation: flashWhite 0.3s ease-out; }
          @keyframes flashRed {
             0% { filter: brightness(1) sepia(0); }
             30% { filter: brightness(1.5) drop-shadow(0 0 15px rgba(220,38,38,1)) sepia(0.8) hue-rotate(-50deg) saturate(5); }
             100% { filter: brightness(1) sepia(0); }
          }
          .animate-flash-red { animation: flashRed 0.3s ease-out; }
          @keyframes iconPopFade {
             0% { transform: scale(0.5) translateY(0); opacity: 0; }
             20% { transform: scale(2) translateY(-10px); opacity: 1; }
             80% { transform: scale(2.5) translateY(-30px); opacity: 0.8; }
             100% { transform: scale(3) translateY(-40px); opacity: 0; }
          }
          .animate-icon-pop { animation: iconPopFade 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) both; }
          @keyframes iconPopFadeDown {
             0% { transform: scale(0.5) translateY(0); opacity: 0; }
             20% { transform: scale(2) translateY(10px); opacity: 1; }
             80% { transform: scale(2.5) translateY(30px); opacity: 0.8; }
             100% { transform: scale(3) translateY(40px); opacity: 0; }
          }
          .animate-icon-pop-down { animation: iconPopFadeDown 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) both; }
          /* 替換為上浮動畫 */
          @keyframes floatUpDamage {
             0% { transform: translate(calc(var(--tx) * 1px), calc(var(--ty) * 1px)) scale(var(--tw-scale-x, 1)); opacity: 0; }
             10% { transform: translate(calc(var(--tx) * 1px), calc(var(--ty) * 1px - 10px)) scale(var(--tw-scale-x, 1)); opacity: 1; }
             60% { transform: translate(calc(var(--tx) * 1px), calc(var(--ty) * 1px - 30px)) scale(var(--tw-scale-x, 1)); opacity: 1; }
             100% { transform: translate(calc(var(--tx) * 1px), calc(var(--ty) * 1px - 50px)) scale(var(--tw-scale-x, 1)); opacity: 0; }
          }
          .animate-float-up-damage { 
             animation: floatUpDamage 2s cubic-bezier(0.25, 1, 0.5, 1) forwards; 
          }
        `}} />
        
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{backgroundImage: 'repeating-linear-gradient(45deg, #1f2937 25%, transparent 25%, transparent 75%, #1f2937 75%, #1f2937)', backgroundPosition: '0 0, 20px 20px', backgroundSize: '40px 40px'}}></div>
        
        {dungeon.battleBgUrl && (
            <img src={dungeon.battleBgUrl} draggable={false} onDragStart={(e)=>e.preventDefault()}
                 className="absolute top-0 left-0 w-full h-1/2 object-cover opacity-40 pointer-events-none" 
                 style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)' }} 
                 alt="" />
        )}

        <div className="h-16 bg-gray-900 border-b border-gray-800 flex justify-between items-center px-6 relative z-10 shadow-md">
           <div className="flex items-center gap-3">
              <span className="bg-red-900 text-red-200 px-3 py-1 rounded text-sm font-bold border border-red-700/50">BATTLE</span>
              <span className="font-bold text-gray-300">{TXT(dungeon.name)} - F{floor}</span>
           </div>
           <div className="flex gap-2">
              <button onClick={() => setItemPanelOpen(!itemPanelOpen)} disabled={battlePhase !== 'idle'} className={`px-4 py-1.5 rounded font-bold text-sm transition-colors border ${itemPanelOpen ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'} disabled:opacity-50 disabled:cursor-not-allowed`}>道具背包 ({runItems.length})</button>
           </div>
        </div>

        {itemPanelOpen && (
           <div className="absolute top-20 right-6 w-72 max-h-96 bg-gray-900 border border-indigo-500/50 rounded-xl p-4 z-[9999] shadow-2xl overflow-y-auto scrollbar-hide animate-[popIn_0.2s_ease-out_forwards]">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-800">
                 <h4 className="font-bold text-indigo-400">當局持有道具</h4>
                 <button onClick={()=>setItemPanelOpen(false)} className="text-gray-500 hover:text-white"><X size={16}/></button>
              </div>
              {runItems.length === 0 ? <div className="text-gray-500 text-sm text-center py-4">無可用道具</div> : 
                 <div className="space-y-2">
                    {runItems.map(it => (
                       <div key={it.instanceId} onClick={() => handleUseItem(it)} className={`bg-gray-800 border p-2 rounded cursor-pointer hover:bg-gray-700 transition-colors ${RARITY_MAP[it.rarity].border}`}>
                          <div className="flex items-center gap-2">
                             {it.imageUrl && <img src={it.imageUrl} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-12 h-12 object-contain" alt=""/>}
                             <div className={`font-bold text-sm ${RARITY_MAP[it.rarity].color}`}>{TXT(it.name)}</div>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{TXT(it.desc)}</div>
                       </div>
                    ))}
                 </div>
              }
           </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col relative z-10 px-8 py-6" onClick={() => { if(pendingTarget) setPendingTarget(null); }}>
           <div className="flex-1 min-h-0 flex justify-center items-center gap-8 mb-8">
              {battleState.enemies.map((enemy, idx) => {
                 const isDead = enemy.baseStats.hp <= 0;
                 const isFocused = focusedEnemy === enemy.id;
                 const isFlashing = flashUnit?.side === 'enemy' && flashUnit?.idx === idx;
                 const isHitFlashing = hitFlashes.some(h => h.side === 'enemy' && h.idx === idx);
                 
                 const isBoss = enemy.id.startsWith('boss_');
                 const isElite = enemy.id.startsWith('elite_');
                 
                 // 放大 Boss 尺寸使畫面更具壓迫感
                 const containerSizeClass = isBoss ? 'w-[20rem] h-[20rem] md:w-[28rem] md:h-[28rem]' : (isElite ? 'w-48 h-48' : 'w-24 h-24');
                 const imgMaxHClass = isBoss ? 'max-h-[320px] md:max-h-[448px]' : (isElite ? 'max-h-[192px]' : 'max-h-[96px]');
                 const imgMaxWClass = isBoss ? 'max-w-[320px] md:max-w-[448px]' : (isElite ? 'max-w-[192px]' : 'max-w-[96px]');
                 const hpBarContainerWidth = isBoss ? 'w-72 md:w-[22rem]' : (isElite ? 'w-48' : 'w-28');
                 const emojiSizeClass = isBoss ? 'text-[10rem] md:text-[14rem]' : (isElite ? 'text-7xl' : 'text-5xl');
                 
                 const hpBarElement = (
                    <div onContextMenu={(e) => { e.preventDefault(); if(!isDead) setBattleUnitDetail(enemy); }} className={`mt-2 ${isBoss ? 'md:mt-4' : ''} ${hpBarContainerWidth} bg-gray-950/80 p-2.5 rounded-lg border border-gray-800 shadow-md backdrop-blur-sm`}>
                        <div className="flex items-center justify-center mb-1.5 border-b border-gray-800 pb-1">
                            <div className={`font-bold text-sm whitespace-normal break-words leading-tight text-center ${ELEMENT_COLORS[enemy.element] || 'text-gray-300'}`}>{TXT(enemy.name)}</div>
                        </div>
                        {(() => {
                            const enemyMaxHp = enemy.baseStats.maxHp;
                            const enemyShield = enemy.baseStats.shield || 0;
                            const enemyTotalCap = enemyMaxHp + enemyShield;
                            const enemyHpPctOfTotal = (enemy.baseStats.hp / enemyTotalCap) * 100;
                            const enemyShieldPctOfTotal = (enemyShield / enemyTotalCap) * 100;
                            return (
                               <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-700 flex relative">
                                  <div className="bg-red-500 h-full transition-all duration-300" style={{width: `${enemyHpPctOfTotal}%`}}></div>
                                  {enemyShield > 0 && <div className="h-full bg-white transition-all absolute right-0" style={{width: `${Math.max(0, Math.min(100, enemyShieldPctOfTotal))}%`}}></div>}
                               </div>
                            );
                        })()}
                        <div className="text-left text-[10px] text-gray-500 mt-0.5 font-mono mb-1.5 pl-1">
                            {enemy.baseStats.hp} / {enemy.baseStats.maxHp}
                            {enemy.baseStats.shield > 0 && <span className="text-white ml-1">({enemy.baseStats.shield})</span>}
                        </div>
                        
                        <div className="flex flex-wrap justify-start gap-1 w-full min-h-[16px] pl-1">
                            {enemy.buffs.slice(0, 5).map((b, bi) => (
                                <img 
                                    key={`buff-${enemy.id}-${b.type}-${bi}`} 
                                    draggable={false} 
                                    onDragStart={(e)=>e.preventDefault()} 
                                    src={getBuffIconUrl(b.type)} 
                                    className="w-4 h-4 bg-gray-950 border border-transparent rounded object-contain p-0.5" 
                                    title={`${BUFF_DB[b.type]?.name || b.type}${b.val !== undefined ? ` (${(b.val*100).toFixed(0)}%)` : ''}`} 
                                    alt="" 
                                    onError={(e)=>{e.target.style.display='none'}}
                                />
                            ))}
                            {enemy.buffs.length > 5 && <span className="text-[10px] text-gray-500 font-bold px-1">...</span>}
                        </div>
                    </div>
                 );

                 return (
                    <div key={`ene-${enemy.id}`} onClick={(e) => { e.stopPropagation(); !isDead && battlePhase === 'idle' && setFocusedEnemy(isFocused ? null : enemy.id); if(pendingTarget) { if(pendingTarget.type === 'item') executeItem(pendingTarget.itemData, idx); else if(pendingTarget.type === 'skill') executeSkill(pendingTarget.casterIdx, pendingTarget.skillIdx, pendingTarget.skillId, idx); } }} className={`relative group flex flex-col items-center transition-all duration-700`}>
                       {/* 將傷害數字移到正中心，且不隨敵人死亡而消失 */}
                       <div className="absolute inset-0 flex justify-center items-center z-[9999] pointer-events-none">
                          {popups.filter(p=>p.side==='enemy'&&p.idx===idx&&!p.isBuff).map(p=>(
                              <div key={p.id} style={{ '--tx': p.tx || 0, '--ty': p.ty || 0 }} className={`absolute font-black drop-shadow-[0_2px_4px_rgba(0,0,0,1)] animate-float-up-damage ${p.color} pointer-events-none text-2xl flex justify-center items-center whitespace-nowrap`}>
                                  <span className="relative inline-block">
                                      {TXT(p.text)}
                                      {p.badges && p.badges.length > 0 && (
                                          <div className="absolute left-full top-1/2 -translate-y-1/2 flex flex-col ml-1 items-start gap-0.5">
                                              {p.badges.map((b,i)=><span key={i} className={`text-[10px] italic font-black ${b.color} drop-shadow-[0_2px_2px_rgba(0,0,0,1)] leading-none`}>{TXT(b.text)}</span>)}
                                          </div>
                                      )}
                                  </span>
                              </div>
                          ))}
                       </div>
                       
                       {/* 敵人實體與血條受死亡影響 */}
                       <div className={`flex flex-col items-center transition-all duration-700 ${isDead ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100'}`}>
                           {isFocused && !isDead && <div className="absolute -top-8 text-red-500 animate-bounce z-10"><div className="w-4 h-4 bg-red-500 rotate-45 border border-red-200 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div></div>}
                           
                           <div className={`${containerSizeClass} relative flex items-end justify-center transition-all ${isFocused ? 'drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] scale-110' : 'cursor-pointer hover:scale-105'} ${isFlashing ? 'animate-flash' : ''} ${isHitFlashing ? 'animate-flash-red' : ''}`} onContextMenu={(e) => { e.preventDefault(); if(!isDead) setBattleUnitDetail(enemy); }}>
                              {enemy.imageUrl ? (
                                  <img src={enemy.imageUrl} draggable={false} onDragStart={(e)=>e.preventDefault()} className={`${imgMaxWClass} ${imgMaxHClass} object-contain drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]`} alt={enemy.name}/>
                              ) : (
                                  <span className={`${emojiSizeClass} ${ELEMENT_COLORS[enemy.element]} drop-shadow-lg`}>{currentNodeInfo?.type==='boss' ? '😈' : currentNodeInfo?.type==='elite' ? '👹' : '👾'}</span>
                              )}
                              
                              <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-[9999]">
                                  {popups.filter(p=>p.side==='enemy'&&p.idx===idx&&p.isBuff).map(p=>(
                                      <img key={p.id} src={getBuffIconUrl(p.text)} draggable={false} onDragStart={(e)=>e.preventDefault()} className={`absolute w-12 h-12 ${p.isDebuff ? 'animate-icon-pop-down' : 'animate-icon-pop'} drop-shadow-xl opacity-0 object-contain`} style={{ animationDelay: `${p.delay || 0}ms` }} alt="" onError={(e)=>{e.target.style.display='none'}}/>
                                  ))}
                              </div>
                           </div>
                           
                           {hpBarElement}
                       </div>
                    </div>
                 );
              })}
           </div>

           <div className="shrink-0 flex justify-center items-end gap-6 relative z-20">
              {pendingTarget && (
                 <div className="absolute -top-12 bg-indigo-900/80 text-indigo-200 px-6 py-2 rounded-full font-bold border border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-pulse z-20 pointer-events-none">請選擇目標... (點擊空白處取消)</div>
              )}
              
              {battleState.party.map((char, idx) => {
                 if(!char) return null;
                 const isDead = char.baseStats.hp <= 0;
                 const isFlashing = flashUnit?.side === 'party' && flashUnit?.idx === idx;
                 const isHitFlashing = hitFlashes.some(h => h.side === 'party' && h.idx === idx);
                 const mHp = char.maxHpLimit || getStats(char, true, globalStorage.charTiers, globalStorage.charEquips, runState).maxHp;
                 const actualSkills = getActualSkills(char, globalStorage.churchUpgrades || []);
                 const hpPct = char.baseStats.hp / mHp;
                 let hpColor = 'text-green-400';
                 if (hpPct < 0.2) hpColor = 'text-red-500';
                 else if (hpPct < 0.5) hpColor = 'text-orange-500';
                 
                 const isMythic = (globalStorage.charTiers[char.id] || 0) >= 5;

                 const handleCharRightClick = (e) => {
                    e.preventDefault();
                    if (isDead || battlePhase !== 'idle') return;
                    setBattleUnitDetail(char);
                 };
                 const handleCharLeftClick = (e) => {
                    e.stopPropagation();
                    if (isDead || battlePhase !== 'idle') return;
                    if (pendingTarget) {
                       if (pendingTarget.type === 'item') executeItem(pendingTarget.itemData, idx);
                       else if (pendingTarget.type === 'skill') executeSkill(pendingTarget.casterIdx, pendingTarget.skillIdx, pendingTarget.skillId, idx);
                    }
                 };

                 return (
                    <div key={`p_battle_${idx}`} className={`relative flex flex-col items-center w-48`}>
                       {/* 傷害數字移到中心，且不隨角色死亡消失 */}
                       <div className="absolute inset-0 flex justify-center items-center z-[9999] pointer-events-none">
                          {popups.filter(p=>p.side==='party'&&p.idx===idx&&!p.isBuff).map(p=>(
                              <div key={p.id} style={{ '--tx': p.tx || 0, '--ty': p.ty || 0 }} className={`absolute font-black drop-shadow-[0_2px_4px_rgba(0,0,0,1)] animate-float-up-damage ${p.color} pointer-events-none text-2xl flex justify-center items-center whitespace-nowrap`}>
                                  <span className="relative inline-block">
                                      {TXT(p.text)}
                                      {p.badges && p.badges.length > 0 && (
                                          <div className="absolute left-full top-1/2 -translate-y-1/2 flex flex-col ml-1 items-start gap-0.5">
                                              {p.badges.map((b,i)=><span key={i} className={`text-[10px] italic font-black ${b.color} drop-shadow-[0_2px_2px_rgba(0,0,0,1)] leading-none`}>{TXT(b.text)}</span>)}
                                          </div>
                                      )}
                                  </span>
                              </div>
                          ))}
                       </div>

                       {/* 實體受死亡影響 */}
                       <div className={`flex flex-col items-center transition-all duration-700 ${isDead ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                           
                           <div onClick={handleCharLeftClick} onContextMenu={handleCharRightClick} className={`w-32 h-32 relative flex items-end justify-center transition-all ${pendingTarget ? 'cursor-pointer drop-shadow-[0_0_15px_rgba(99,102,241,0.8)] scale-110 z-20' : 'cursor-pointer hover:scale-105'} ${isFlashing ? 'animate-flash' : ''} ${isHitFlashing ? 'animate-flash-red' : ''} ${isMythic && ultToggled[idx] ? 'drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]' : ''}`}>
                              {getActiveCharImg(char) ? (
                                  <img src={getActiveCharImg(char)} draggable={false} onDragStart={(e)=>e.preventDefault()} className="max-w-full max-h-full object-contain drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]" alt={char.name}/>
                              ) : (
                                  <span className={`text-7xl ${ELEMENT_COLORS[char.element]} drop-shadow-lg`}>{ROLE_ICONS[char.role]}</span>
                              )}
                              
                              <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-[9999]">
                                  {popups.filter(p=>p.side==='party'&&p.idx===idx&&p.isBuff).map(p=>(
                                      <img key={p.id} src={getBuffIconUrl(p.text)} draggable={false} onDragStart={(e)=>e.preventDefault()} className={`absolute w-12 h-12 ${p.isDebuff ? 'animate-icon-pop-down' : 'animate-icon-pop'} drop-shadow-xl opacity-0 object-contain`} style={{ animationDelay: `${p.delay || 0}ms` }} alt="" onError={(e)=>{e.target.style.display='none'}}/>
                                  ))}
                              </div>
                           </div>
                           
                           <div onClick={handleCharLeftClick} onContextMenu={handleCharRightClick} className={`mt-2 w-48 bg-gray-950/80 p-3 rounded-lg border border-gray-800 shadow-md backdrop-blur-sm ${pendingTarget ? 'cursor-pointer' : ''}`}>
                              <div className="flex items-center gap-2 mb-2 border-b border-gray-800 pb-1">
                                  <img src={getRoleIconUrl(char.role, char.element)} className="w-5 h-5 object-contain" alt="" onError={(e)=>{e.target.style.display='none'}} />
                                  <div className={`font-bold text-sm truncate ${RARITY_MAP[RARITY_ORDER[globalStorage.charTiers[char.id] || 0]].color}`}>
                                      {isMythic ? `${TXT(char.title)}．${TXT(char.name)}` : TXT(char.name)}
                                  </div>
                              </div>
                              <div className="space-y-1.5 px-1">
                                 <div className="flex justify-between items-end mb-0.5">
                                    <span className="text-[10px] font-bold text-gray-500 leading-none">HP</span>
                                    <span className={`text-[11px] font-bold leading-none ${hpColor}`}>
                                       {Math.max(0, char.baseStats.hp)}/{mHp}
                                       {char.baseStats.shield > 0 && <span className="text-white ml-1">({char.baseStats.shield})</span>}
                                    </span>
                                 </div>
                                 {(() => {
                                    const charShield = char.baseStats.shield || 0;
                                    const charTotalCap = mHp + charShield;
                                    const charHpPctOfTotal = (char.baseStats.hp / charTotalCap) * 100;
                                    const charShieldPctOfTotal = (charShield / charTotalCap) * 100;
                                    const hpPctForColor = char.baseStats.hp / mHp;
                                    return (
                                       <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-700 flex relative">
                                          <div className={`h-full transition-all duration-300 ${hpPctForColor < 0.2 ? 'bg-red-500' : hpPctForColor < 0.5 ? 'bg-orange-500' : 'bg-green-500'}`} style={{width: `${Math.max(0, Math.min(100, charHpPctOfTotal))}%`}}></div>
                                          {charShield > 0 && <div className="h-full bg-white transition-all absolute right-0" style={{width: `${Math.max(0, Math.min(100, charShieldPctOfTotal))}%`}}></div>}
                                       </div>
                                    );
                                 })()}
                                 <div className="flex justify-between items-end mb-0.5 mt-2">
                                    <span className="text-[10px] font-bold text-gray-500 leading-none">EP</span>
                                    <span className={`text-[11px] font-bold leading-none text-yellow-500`}>{Math.floor(char.energy)}%</span>
                                 </div>
                                 <div onClick={(e) => { e.stopPropagation(); if(battlePhase==='idle' && !pendingTarget && !isSilenced(char) && char.energy >= 100) { let newU = [...ultToggled]; newU[idx] = !newU[idx]; setUltToggled(newU); } }}
                                      className={`w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border transition-all ${char.energy>=100 && !isSilenced(char) ? 'border-yellow-400 cursor-pointer shadow-[0_0_5px_rgba(250,204,21,0.5)] hover:scale-105' : 'border-gray-700'}`}>
                                    <div className={`h-full transition-all duration-300 relative ${char.energy >= 100 ? 'bg-yellow-400 animate-pulse' : 'bg-yellow-600'}`} style={{width: `${Math.min(100, char.energy)}%`}}></div>
                                 </div>
                              </div>
                              
                              <div className="flex flex-wrap justify-start gap-1 w-full min-h-[16px] mt-2 px-1">
                                 {char.buffs.slice(0, 5).map((b, bi) => (
                                     <img 
                                         key={`char-buff-${char.id}-${b.type}-${bi}`} 
                                         draggable={false} 
                                         onDragStart={(e)=>e.preventDefault()} 
                                         src={getBuffIconUrl(b.type)} 
                                         className="w-4 h-4 bg-gray-950 border border-transparent rounded object-contain p-0.5" 
                                         title={`${BUFF_DB[b.type]?.name || b.type}${b.val !== undefined ? ` (${(b.val*100).toFixed(0)}%)` : ''}`} 
                                         alt="" 
                                         onError={(e)=>{e.target.style.display='none'}}
                                     />
                                 ))}
                                 {char.buffs.length > 5 && <span className="text-[10px] text-gray-500 font-bold px-1">...</span>}
                              </div>

                              {!isDead && (
                                 <div className="flex justify-start gap-2 pt-2 mt-2 border-t border-gray-800 px-1">
                                    {actualSkills.map((actualSid, sIdx) => {
                                        const sDef = SKILL_DB[actualSid]; const cd = skillCooldowns[`${idx}_${sIdx}`] || 0; const isUp = actualSid.endsWith('_ex');
                                        const silenced = isSilenced(char);
                                        const isDisabled = cd > 0 || silenced;
                                        return (
                                            <div key={`skill-${char.id}-${actualSid}`} 
                                               onMouseEnter={(e) => handleTooltipOpen(e, 'skill', { sDef, isUp, actualSid, cStats: getStats(char, true, globalStorage.charTiers, globalStorage.charEquips, runState) })}
                                               onMouseMove={handleTooltipMove} onMouseLeave={handleTooltipClose}
                                               className="relative"
                                            >
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); !isDisabled && handleSkillClick(idx, sIdx); }}
                                                    disabled={isDisabled || battlePhase !== 'idle' || pendingTarget}
                                                    className={`relative w-8 h-8 rounded-md flex items-center justify-center border transition-all overflow-hidden ${isDisabled ? 'bg-gray-900 border-gray-800 cursor-not-allowed' : (isUp ? 'bg-gray-800 border-orange-500/50 hover:border-orange-400 hover:bg-gray-700 cursor-pointer shadow-sm' : 'bg-gray-800 border-blue-500/50 hover:border-blue-400 hover:bg-gray-700 cursor-pointer shadow-sm')}`}
                                                >
                                                    <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getSkillIconUrl(actualSid)} className={`absolute inset-0 w-full h-full object-cover z-0 ${isDisabled ? 'opacity-30 grayscale' : ''}`} alt="skill" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='block';}} />
                                                    
                                                    {isDisabled && (
                                                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60 backdrop-blur-[1px]">
                                                            <span className={`font-black text-white text-sm drop-shadow-[0_1px_1px_rgba(0,0,0,1)] ${silenced && cd === 0 ? 'text-cyan-300' : ''}`}>{silenced && cd === 0 ? '封' : cd}</span>
                                                        </div>
                                                    )}
                                                    
                                                    <span style={{display: 'none'}} className={`font-black text-xs relative z-10 ${isUp ? 'text-orange-400' : 'text-blue-400'}`}>{TXT(sDef.name).charAt(0)}</span>
                                                </button>
                                            </div>
                                        )
                                    })}
                                 </div>
                              )}
                           </div>
                       </div>
                    </div>
                 );
              })}
           </div>

           <button onClick={executeAttackPhase} disabled={battlePhase !== 'idle'} className="absolute bottom-6 right-6 md:bottom-10 md:right-10 w-24 h-24 bg-red-700 hover:bg-red-600 disabled:bg-gray-800 disabled:text-gray-600 rounded-full flex flex-col items-center justify-center font-black text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all hover:scale-105 z-40 border-4 border-red-500/50">
               <Sword size={36} className="mb-1 drop-shadow-md" />
               <span className="text-sm">{battlePhase === 'idle' ? 'ATTACK' : 'ENEMY'}</span>
           </button>

           {battleUnitDetail && (
              <div className="fixed inset-0 z-[999999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setBattleUnitDetail(null)}>
                 <div className="bg-gray-800 border-2 border-gray-600 rounded-xl p-6 max-w-md w-full text-white shadow-2xl relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setBattleUnitDetail(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
                    <div className="flex flex-col items-center mb-4">
                       <div className="w-24 h-24 bg-gray-900 border border-gray-700 rounded-xl shrink-0 flex items-center justify-center shadow-inner relative overflow-hidden mb-3">
                           {(() => {
                               const activeImg = battleUnitDetail.role ? getActiveCharImg(battleUnitDetail) : battleUnitDetail.imageUrl;
                               if (activeImg) {
                                   return <img src={activeImg} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-full h-full object-cover object-top" alt=""/>;
                               }
                               return <span className={`text-5xl ${ELEMENT_COLORS[battleUnitDetail.element]}`}>{ROLE_ICONS[battleUnitDetail.role] || (battleUnitDetail.id.startsWith('boss') ? '😈' : '👾')}</span>;
                           })()}
                           {battleUnitDetail.role && <div className="absolute top-1 left-1"><img src={getRoleIconUrl(battleUnitDetail.role, battleUnitDetail.element)} className="w-6 h-6 object-contain drop-shadow-md" alt="" onError={(e)=>{e.target.style.display='none'}}/></div>}
                       </div>
                       <div className="w-full flex flex-col items-center text-center">
                           <h3 className={`text-2xl font-bold mb-1 truncate ${battleUnitDetail.role ? RARITY_MAP[RARITY_ORDER[globalStorage.charTiers[battleUnitDetail.id]||0]].color : ELEMENT_COLORS[battleUnitDetail.element]}`}>{TXT(battleUnitDetail.name)}</h3>
                           {battleUnitDetail.role ? (
                               <div className="text-gray-400 text-xs font-bold mb-2 tracking-widest">{battleUnitDetail.type === 'phys' ? '物理攻擊型' : '魔法攻擊型'} / {RARITY_MAP[RARITY_ORDER[globalStorage.charTiers[battleUnitDetail.id]||0]].name}</div>
                           ) : (
                               <div className="text-gray-400 text-xs font-bold mb-2 tracking-widest">Lv.{floor} {battleUnitDetail.id.startsWith('boss') ? '首領級魔物' : battleUnitDetail.id.startsWith('elite') ? '菁英魔物' : '一般魔物'}</div>
                           )}
                           {(() => {
                               const unitMaxHp = battleUnitDetail.maxHpLimit || battleUnitDetail.baseStats.maxHp;
                               const unitShield = battleUnitDetail.baseStats.shield || 0;
                               const unitTotalCap = unitMaxHp + unitShield;
                               const unitHpPctOfTotal = (battleUnitDetail.baseStats.hp / unitTotalCap) * 100;
                               const unitShieldPctOfTotal = (unitShield / unitTotalCap) * 100;
                               const hpPctForColor = battleUnitDetail.baseStats.hp / unitMaxHp;
                               return (
                                   <div className="w-full bg-gray-950 h-2 rounded-full overflow-hidden border border-gray-700 flex relative mt-1">
                                       <div className={`h-full transition-all duration-300 ${hpPctForColor < 0.2 ? 'bg-red-500' : hpPctForColor < 0.5 ? 'bg-orange-500' : 'bg-green-500'}`} style={{width: `${Math.max(0, Math.min(100, unitHpPctOfTotal))}%`}}></div>
                                       {unitShield > 0 && <div className="h-full bg-white transition-all absolute right-0" style={{width: `${Math.max(0, Math.min(100, unitShieldPctOfTotal))}%`}}></div>}
                                   </div>
                               );
                           })()}
                       </div>
                    </div>

                 {battleUnitDetail.ult && ULT_DB[battleUnitDetail.ult] && (
                     <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 mb-4 shrink-0">
                         <h4 className="text-red-400 font-bold text-xs mb-2 border-b border-gray-700 pb-1 flex items-center gap-1"><Zap size={14}/> 終極技能 (大招)</h4>
                         <div className="flex items-start gap-3">
                             <div className="w-12 h-12 rounded-lg border-2 border-red-500/50 bg-gray-800 overflow-hidden flex-shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.3)] relative">
                                 <img draggable={false} onDragStart={(e)=>e.preventDefault()} src={getSkillIconUrl(battleUnitDetail.ult)} className="w-full h-full object-cover relative z-10" alt="" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='flex';}}/>
                                 <span style={{display:'none'}} className="text-xl font-black text-red-400 absolute inset-0 flex items-center justify-center z-0">終</span>
                             </div>
                             <div className="flex-1 min-w-0">
                                 <div className="font-bold text-sm text-white mb-1">{TXT(ULT_DB[battleUnitDetail.ult].name)}</div>
                                 <div className="text-[10px] text-gray-300 leading-snug">{ULT_DB[battleUnitDetail.ult].descFn ? ULT_DB[battleUnitDetail.ult].descFn(getStats(battleUnitDetail, !!battleUnitDetail.role, globalStorage.charTiers, globalStorage.charEquips, runState), battleUnitDetail, battleState) : FMT(ULT_DB[battleUnitDetail.ult].desc)}</div>
                             </div>
                         </div>
                     </div>
                 )}
                 
                 <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 mb-4">
                     <h4 className="text-gray-300 font-bold text-xs mb-2 border-b border-gray-700 pb-1">當前面板數值</h4>
                     <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs font-mono text-gray-400">
                         {(() => {
                             let st = getStats(battleUnitDetail, !!battleUnitDetail.role, globalStorage.charTiers, globalStorage.charEquips, runState);
                             let baseUnit = { ...battleUnitDetail, buffs: [] };
                             let baseSt = getStats(baseUnit, !!battleUnitDetail.role, globalStorage.charTiers, globalStorage.charEquips, runState);
                             
                             const renderStat = (label, key, color, isPct = false) => {
                                 let finalVal = st[key] || 0;
                                 let baseVal = baseSt[key] || 0;
                                 
                                 if (isPct && (key === 'da' || key === 'ta' || key === 'crit')) {
                                     finalVal = Math.min(1.0, finalVal);
                                 }

                                 const diff = finalVal - baseVal;
                                 const hideDiff = key === 'crit' || key === 'da' || key === 'ta';
                                 const hasDiff = hideDiff ? false : (isPct ? Math.abs(diff) >= 0.005 : Math.abs(diff) > 0);
                                 const formatVal = (val) => isPct ? `${(val*100).toFixed(0)}%` : val;
                                 
                                 const totalStr = formatVal(finalVal);
                                 const baseStr = formatVal(baseVal);
                                 const diffStr = formatVal(Math.abs(diff));

                                 return (
                                     <div>{label}: <span className={`${color} font-bold`}>{totalStr}</span>
                                         {hasDiff && (
                                            <span className="text-gray-500 ml-1 text-[10px]">
                                                (<span className="text-white">{baseStr}</span>
                                                {diff > 0 ? <span className="text-green-400"> +{diffStr}</span> : <span className="text-red-400"> -{diffStr}</span>})
                                            </span>
                                         )}
                                     </div>
                                 );
                             };

                             return (
                                 <>
                                     {renderStat('物理攻擊', 'atk', 'text-orange-400')}
                                     {renderStat('魔法攻擊', 'matk', 'text-purple-400')}
                                     {renderStat('物理防禦', 'pdef', 'text-yellow-400')}
                                     {renderStat('魔法防禦', 'mdef', 'text-cyan-400')}
                                     {renderStat('暴擊率', 'crit', 'text-gray-300', true)}
                                     <div>DA / TA: <span className="text-red-400 font-bold">{(Math.min(1.0, st['da'] || 0)*100).toFixed(0)}%</span> / <span className="text-red-400 font-bold">{(Math.min(1.0, st['ta'] || 0)*100).toFixed(0)}%</span></div>
                                 </>
                             );
                         })()}
                     </div>
                 </div>
                 
                 <div className="bg-gray-900 rounded-lg border border-gray-700 flex flex-col overflow-hidden h-48 shrink-0">
                     <h4 className="text-yellow-400 font-bold text-xs p-3 border-b border-gray-700 bg-gray-800 shrink-0">當前狀態與增益</h4>
                     <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
                         {battleUnitDetail.buffs && battleUnitDetail.buffs.length > 0 ? (
                             battleUnitDetail.buffs.map((b, i) => {
                                 const bDef = BUFF_DB[b.type] || {};
                                 const isStack = b.stacks !== undefined || bDef.mech === 'stack' || bDef.mech === 'stack_duration';
                                 const isDuration = b.duration !== undefined && b.duration < 99;
                                 const valText = b.val !== undefined ? `(效力: ${(b.val*100).toFixed(0)}%)` : '';
                                 
                                 let statusText = '';
                                 if (isStack && isDuration) statusText = `${b.stacks || 1}層 / ${b.duration}回合`;
                                 else if (isStack) statusText = `${b.stacks || 1}層`;
                                 else if (isDuration) statusText = `${b.duration}回合`;
                                 
                                 // 計算出戰鬥單位當前的屬性來傳給解析器
                                 const unitStats = getStats(battleUnitDetail, !!battleUnitDetail.role, globalStorage.charTiers, globalStorage.charEquips, runState);
                                 let refStats = unitStats;
                                 
                                 // 判斷是否需要切換為快照體質來渲染正確的 Tooltip 數值
                                 if (CASTER_SCALING_BUFFS.includes(b.type)) {
                                     if (b.casterStats) {
                                         refStats = b.casterStats;
                                     } else if (b.casterId && b.casterSide && battleState[b.casterSide]) {
                                         let casterEntity = battleState[b.casterSide].find(c => c && c.id === b.casterId);
                                         if (casterEntity) {
                                             refStats = getStats(casterEntity, b.casterSide === 'party', globalStorage.charTiers, globalStorage.charEquips, runState);
                                         }
                                     }
                                 }
                                 
                                 const contextStats = { ...refStats, stacks: b.stacks, duration: b.duration };

                                 // 判斷是否為 Debuff (根據 effectType 或是簡易判斷名稱)
                                 const isDebuff = bDef.effectType === 'silence' || bDef.effectType === 'control' || b.type.toLowerCase().includes('down') || bDef.dot || b.isDebuff === true;
                                 const bgColorClass = isDebuff ? 'bg-red-950/40 border-red-900/50' : 'bg-gray-800 border-gray-700';
                                 const textColorClass = isDebuff ? (bDef.color || 'text-red-300') : (bDef.color || 'text-white');

                                 return (
                                     <div key={i} className={`flex items-start gap-2 p-1.5 rounded-md border shadow-sm ${bgColorClass}`}>
                                         <img src={getBuffIconUrl(b.type)} className="w-6 h-6 object-contain rounded border border-transparent shrink-0" alt="" onError={(e)=>{e.target.style.display='none'}}/>
                                         <div className="min-w-0 flex-1">
                                            <div className={`text-xs font-bold flex items-center gap-1.5 leading-tight ${textColorClass}`}>
                                                {TXT(bDef.name)} {valText && <span className="text-yellow-400 font-normal">{valText}</span>} <span className="text-[10px] text-gray-400 font-normal">{statusText}</span>
                                            </div>
                                            <div className={`text-[10px] ${isDebuff ? 'text-red-200/70' : 'text-gray-400'} leading-tight break-words whitespace-normal mt-0.5`}>
                                                {bDef.desc ? renderDynamicDesc(bDef.desc, contextStats) : (bDef.descFn ? bDef.descFn(unitStats) : FMT(bDef.name))}
                                            </div>
                                         </div>
                                     </div>
                                 )
                             })
                         ) : (
                             <div className="text-gray-500 text-xs font-bold text-center py-4">目前沒有任何狀態</div>
                         )}
                     </div>
                 </div>
              </div>
           </div>
           )}
        </div>
      </div>
    );
  };

  const renderLoot = () => {
     const golds = postBattleLoot.filter(l => l.type === 'gold');
     const flowers = postBattleLoot.filter(l => l.type === 'flower');
     const equips = postBattleLoot.filter(l => l.type === 'equip');
     const mats = postBattleLoot.filter(l => l.type === 'mat');
     const upgStones = postBattleLoot.filter(l => l.type === 'upgStone');
     const evoStones = postBattleLoot.filter(l => l.type === 'evoStone');
     const colosStones = postBattleLoot.filter(l => l.type === 'colosStone');
     const goldImgUrl = materialDb['mat100']?.imageUrl;

     return (
     <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white p-8 relative">
        <div className="absolute inset-0 bg-yellow-900/10 z-0 pointer-events-none"></div>
        <h2 className="text-5xl font-black mb-12 text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)] relative z-10 tracking-widest">戰鬥勝利</h2>
        <div className="bg-gray-900 border-2 border-yellow-600/50 rounded-2xl p-8 max-w-3xl w-full shadow-2xl relative z-10 flex flex-col max-h-[80vh]">
           <h3 className="text-xl font-bold mb-6 text-center text-gray-300 border-b border-gray-700 pb-2 shrink-0">獲得戰利品</h3>
           
           <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-5 pr-2 pb-4">
              
              {/* 新增：將宿命解放 (EP 轉化) 資訊整合至此，排版整齊對齊 */}
              {(bossEpLog?.length > 0 || bossTierUpgradeLog?.length > 0) && (
                 <div className="flex gap-4 mb-2 w-full shrink-0">
                    {bossEpLog && bossEpLog.length > 0 && (
                       <div className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded-xl p-4">
                          <h4 className="text-sm font-bold text-purple-400 mb-3 border-b border-gray-700/50 pb-1.5 flex items-center gap-2">
                             <Zap size={16} className="text-yellow-400 animate-pulse" />
                             <span>宿命解放 — 體質突破加成</span>
                          </h4>
                          <div className="space-y-2 font-mono text-xs">
                             {bossEpLog.map((log, idx) => (
                                <div key={`ep-log-${idx}`} className="flex justify-between items-center bg-gray-950/80 px-4 py-2 rounded-lg border border-gray-800">
                                   <span className="font-bold text-gray-200">{log.name}</span>
                                   <div className="flex items-center gap-6">
                                      <span className="text-gray-500">消耗 EP: <strong className="text-yellow-500">{log.ep}</strong></span>
                                      <span className="text-purple-300">局內體質: <strong className="text-purple-400 font-black">+{log.boostPct}%</strong></span>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    )}
                    {bossTierUpgradeLog && bossTierUpgradeLog.length > 0 && (
                       <div className="flex-1 bg-gray-800/50 border border-yellow-500/30 rounded-xl p-4">
                          <h4 className="text-sm font-bold text-yellow-400 mb-3 border-b border-gray-700/50 pb-1.5 flex items-center gap-2">
                             <ArrowUpCircle size={16} className="text-yellow-400 animate-bounce" />
                             <span>擊敗首領 — 潛能突破</span>
                          </h4>
                          <div className="space-y-2 font-mono text-xs">
                             {bossTierUpgradeLog.map((log, idx) => (
                                <div key={`tier-log-${idx}`} className="flex justify-between items-center bg-gray-950/80 px-4 py-2 rounded-lg border border-gray-800">
                                   <span className="font-bold text-gray-200">{log.name}</span>
                                   <div className="flex items-center gap-2">
                                      <span className="text-gray-500">{log.oldTierName}</span>
                                      <ArrowRight size={12} className="text-gray-400" />
                                      <span className={`font-black ${log.color}`}>{log.newTierName}</span>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    )}
                 </div>
              )}

              <div className="flex gap-2 w-full">
                 <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 bg-gray-800 border border-yellow-600/30 p-2 sm:p-3 rounded-xl shadow-inner min-w-0">
                    {goldImgUrl ? <img src={goldImgUrl} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md" alt=""/> : <span className="text-2xl sm:text-3xl drop-shadow-md">🪙</span>}
                    <div className="flex flex-col text-center sm:text-left">
                        <span className="text-[10px] sm:text-xs text-gray-400 font-bold mb-0.5 truncate max-w-[60px] sm:max-w-none">{TXT(goldName)}</span>
                        <span className="font-black text-lg sm:text-2xl text-yellow-400 leading-none">{golds.reduce((sum, g) => sum + g.val, 0)}</span>
                    </div>
                 </div>
                 <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 bg-gray-800 border border-pink-500/30 p-2 sm:p-3 rounded-xl shadow-inner min-w-0">
                    {getMatImg('祈願花') ? <img src={getMatImg('祈願花')} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md" alt=""/> : <span className="text-2xl sm:text-3xl drop-shadow-md">🌸</span>}
                    <div className="flex flex-col text-center sm:text-left">
                        <span className="text-[10px] sm:text-xs text-gray-400 font-bold mb-0.5 truncate max-w-[60px] sm:max-w-none">祈願花</span>
                        <span className="font-black text-lg sm:text-2xl text-pink-300 leading-none">{flowers.reduce((sum, f) => sum + f.val, 0)}</span>
                    </div>
                 </div>
                 {upgStones.length > 0 && (
                     <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 bg-gray-800 border border-yellow-400/30 p-2 sm:p-3 rounded-xl shadow-inner min-w-0">
                        {getMatImg('升階石') ? <img src={getMatImg('升階石')} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md" alt=""/> : <span className="text-2xl sm:text-3xl drop-shadow-md">💎</span>}
                        <div className="flex flex-col text-center sm:text-left">
                            <span className="text-[10px] sm:text-xs text-gray-400 font-bold mb-0.5 truncate max-w-[60px] sm:max-w-none">升階石</span>
                            <span className="font-black text-lg sm:text-2xl text-yellow-300 leading-none">{upgStones.reduce((sum, f) => sum + f.val, 0)}</span>
                        </div>
                     </div>
                 )}
                 {evoStones.length > 0 && (
                     <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 bg-gray-800 border border-purple-500/30 p-2 sm:p-3 rounded-xl shadow-inner min-w-0">
                        {getMatImg('進化石') ? <img src={getMatImg('進化石')} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md" alt=""/> : <span className="text-2xl sm:text-3xl drop-shadow-md">🔮</span>}
                        <div className="flex flex-col text-center sm:text-left">
                            <span className="text-[10px] sm:text-xs text-gray-400 font-bold mb-0.5 truncate max-w-[60px] sm:max-w-none">進化石</span>
                            <span className="font-black text-lg sm:text-2xl text-purple-300 leading-none">{evoStones.reduce((sum, f) => sum + f.val, 0)}</span>
                        </div>
                     </div>
                 )}
                 {colosStones.length > 0 && (
                     <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 bg-gray-800 border border-blue-400/30 p-2 sm:p-3 rounded-xl shadow-inner min-w-0">
                        {getMatImg(colosStones[0].data.name) ? <img src={getMatImg(colosStones[0].data.name)} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md" alt=""/> : <span className="text-2xl sm:text-3xl drop-shadow-md">💎</span>}
                        <div className="flex flex-col text-center sm:text-left">
                            <span className="text-[10px] sm:text-xs text-gray-400 font-bold mb-0.5 truncate max-w-[60px] sm:max-w-[80px]">{TXT(colosStones[0].data.name)}</span>
                            <span className="font-black text-lg sm:text-2xl text-blue-300 leading-none">{colosStones.reduce((sum, f) => sum + f.val, 0)}</span>
                        </div>
                     </div>
                 )}
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col min-h-[140px] shrink-0">
                 <h4 className="text-sm font-bold text-gray-400 mb-3 border-b border-gray-700 pb-1">獲得裝備</h4>
                 <div className="flex flex-col gap-2 flex-1">
                    {equips.length > 0 ? equips.map(loot => (
                        <div key={loot.id} className="flex items-center gap-4 bg-gray-900 border border-gray-600 p-2.5 rounded-lg shadow-sm">
                           {loot.data?.imageUrl ? (
                               <img src={loot.data.imageUrl} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-10 h-10 object-contain drop-shadow-sm" alt="" />
                           ) : (
                               <span className="text-2xl">✨</span>
                           )}
                           <span className={`font-bold text-lg ${RARITY_MAP[loot.rarity]?.color || 'text-white'}`}>{TXT(loot.data.name)}</span>
                        </div>
                    )) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 font-bold">無裝備掉落</div>
                    )}
                 </div>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col min-h-[180px] shrink-0">
                 <h4 className="text-sm font-bold text-gray-400 mb-3 border-b border-gray-700 pb-1">獲得素材</h4>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 content-start">
                    {mats.length > 0 ? mats.map(loot => {
                        const matName = loot.data.name;
                        const matData = getMatData(matName);
                        return (
                           <div key={loot.id} className="flex items-center gap-3 bg-gray-900 border border-gray-600 p-2 rounded-lg shadow-sm">
                              <div className={`relative w-12 h-12 bg-gray-800 border-2 ${RARITY_MAP[matData.rarity]?.border || 'border-gray-600'} rounded-lg flex items-center justify-center shrink-0`}>
                                 {matData.imageUrl ? (
                                     <img src={matData.imageUrl} draggable={false} onDragStart={(e)=>e.preventDefault()} className="w-8 h-8 object-contain drop-shadow-sm" alt="" />
                                 ) : (
                                     <span className="text-xl">📦</span>
                                 )}
                                 <div className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md border border-gray-600 pointer-events-none shadow-sm z-10">
                                     {loot.data.val}
                                 </div>
                              </div>
                              <span className={`font-bold text-sm truncate ${RARITY_MAP[matData.rarity]?.color || 'text-white'}`}>{TXT(matName)}</span>
                           </div>
                        );
                    }) : (
                        <div className="col-span-full flex items-center justify-center h-20 text-gray-500 font-bold">無素材掉落</div>
                    )}
                 </div>
              </div>

           </div>
           
           <button onClick={handleClaimLoot} className="w-full py-4 mt-4 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-bold text-xl text-white shadow-lg transition-transform hover:scale-[1.02] shrink-0">
              收下戰利品並繼續
           </button>
        </div>
     </div>
     );
  };

  const renderGameOver = () => (
     <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-8">
        <Skull size={100} className="mb-8 text-red-600 animate-pulse drop-shadow-[0_0_40px_rgba(220,38,38,0.8)]" />
        <h2 className="text-6xl font-black mb-6 text-red-500 tracking-widest">全軍覆沒</h2>
        <p className="text-xl text-gray-400 mb-12 text-center max-w-lg leading-relaxed">隊伍在深淵中倒下。失去了一半的採集素材，帶著殘破的身軀退回城鎮。</p>
        <button onClick={() => {
           setGlobalStorage(prev => {
               let newMats = {...prev.materials};
               Object.entries(matsGainedThisRun).forEach(([mName, mQty]) => {
                   for(let i=0; i<mQty; i++) {
                       if(Math.random() < 0.5) newMats[mName] = Math.max(0, (newMats[mName] || 0) - 1);
                   }
               });
               return {...prev, materials: newMats, escapePenalty: true};
           });
           let newParty = [...partySlots];
           newParty.forEach(p => { if(p) p.energy = 0; });
           setPartySlots(newParty);
           setRunItems([]);
           resetRunState();
           setScreen('town');
        }} className="px-10 py-4 bg-red-900 hover:bg-red-800 rounded-xl font-bold text-2xl border border-red-700 transition-all hover:scale-105">
           返回城鎮
        </button>
     </div>
  );

  const renderVictory = () => {
     const safeDList = Array.isArray(dungeonList) && dungeonList.length > 0 ? dungeonList : [{ id: 'forest', name: '未知地下城', iconName: 'Mountain' }];
     const dungeonName = safeDList.find(d=>d.id===runDungeon)?.name || '地下城';
     return (
         <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white p-8 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center opacity-20 z-0">
                <Sparkles size={600} className="text-yellow-500 animate-[spin_20s_linear_infinite]" />
            </div>
            <div className="relative z-10 flex flex-col items-center">
                <h2 className="text-7xl font-black mb-6 text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)] tracking-widest">探索成功</h2>
                <p className="text-2xl text-gray-300 mb-12 text-center">你成功征服了 {TXT(dungeonName)}，帶著豐厚的戰利品平安歸來。</p>
                <button onClick={handleVictoryReturn} className="px-12 py-5 bg-yellow-600 hover:bg-yellow-500 rounded-2xl font-bold text-2xl shadow-[0_0_30px_rgba(202,138,4,0.5)] transition-all hover:scale-110">
                   凱旋歸城
                </button>
            </div>
         </div>
     );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white p-4">
         <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-6"></div>
         <h2 className="text-2xl font-bold text-gray-300 tracking-widest animate-pulse mb-4">
            {loadingState.phase === 'fetching' ? '連線至異界檔案庫中...' : '加載視覺資源中...'}
         </h2>
         {loadingState.phase === 'images' && loadingState.total > 0 && (
            <div className="w-64 max-w-full flex flex-col items-center">
               <div className="w-full bg-gray-800 rounded-full h-3 mb-2 overflow-hidden border border-gray-700 shadow-inner">
                  <div className="bg-yellow-500 h-full transition-all duration-300 relative" style={{ width: `${Math.floor((loadingState.loaded / loadingState.total) * 100)}%` }}>
                     <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                  </div>
               </div>
               <div className="text-gray-400 text-sm font-mono tracking-wider">{loadingState.loaded} / {loadingState.total}</div>
            </div>
         )}
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}} />
      {(() => {
        switch (screen) {
          case 'title': return renderTitle();
          case 'town': return renderTown();
          case 'market': return renderMarket();
          case 'guild': return renderGuild();
          case 'church': return renderChurch();
          case 'select_dungeon': return renderSelectDungeon();
          case 'assembly': return renderAssembly();
          case 'synthesis': return renderSynthesis();
          case 'map': return renderMap();
          case 'camp': return renderCamp();
          case 'shop': return renderShop();
          case 'event': return renderEvent();
          case 'battle': return renderBattle();
          case 'loot': return renderLoot();
          case 'gameover': return renderGameOver();
          case 'victory': return renderVictory();
          default: return renderTitle();
        }
      })()}

      {renderCharDetailModal()}
      {renderDetailItemModal()}

      {globalTooltip && (
         <div className="fixed z-[999999] pointer-events-none transition-opacity duration-75" style={{ left: globalTooltip.left, top: globalTooltip.top, transform: globalTooltip.transform }}>
            {globalTooltip.type === 'equip' && renderEquipTooltip(globalTooltip.data, globalTooltip.sumMode)}
            {globalTooltip.type === 'skill' && renderSkillTooltip(globalTooltip.data.sDef, globalTooltip.data.isUp, globalTooltip.data.actualSid, globalTooltip.data.cStats)}
            {globalTooltip.type === 'stone' && (
               <div className="w-56 p-4 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl relative z-[999999]">
                  <div className={`font-bold ${RARITY_MAP[globalTooltip.data.rarity].color} mb-1 border-b border-gray-700 pb-2`}>{TXT(globalTooltip.data.name)}</div>
                  <div className="text-xs text-gray-300 mt-2">{TXT(globalTooltip.data.desc)}</div>
               </div>
            )}
            {globalTooltip.type === 'compare' && (
             <div className="flex gap-2 relative z-[999999]">
                 {renderEquipTooltip(globalTooltip.data.eq)}
                 {globalTooltip.data.currentEq && (
                     <div className="opacity-90">
                         <div className="text-yellow-400 text-xs font-bold mb-1 pl-1 drop-shadow-md">▶ 當前裝備</div>
                         {renderEquipTooltip(globalTooltip.data.currentEq, true)}
                     </div>
                 )}
             </div>
          )}
       </div>
    )}

    {fullImageView && (() => {
       const char = fullImageView;
       // 自動防呆：若角色沒有 skins 陣列，則將原圖作為預設造型包裝成陣列
       const skinsFromDb = skinDb.filter(s => s.charId === char.id);
       const skins = [{ name: '預設造型', seriesname: '經典外觀', imageUrl: char.imageUrl }, ...skinsFromDb];
       const currentSkin = skins[currentSkinIndex] || skins[0];
       const currentSkinImgUrl = currentSkin.imageUrl || currentSkin.url;

       // 支援手機端左右滑動
       let touchStartX = 0;
       const handleTouchStart = (e) => { touchStartX = e.changedTouches[0].screenX; };
       const handleTouchEnd = (e) => {
           let touchEndX = e.changedTouches[0].screenX;
           if (touchStartX - touchEndX > 50 && skins.length > 1) {
               setSkinSlideDirection('right');
               setCurrentSkinIndex(p => (p + 1) % skins.length);
           }
           if (touchEndX - touchStartX > 50 && skins.length > 1) {
               setSkinSlideDirection('left');
               setCurrentSkinIndex(p => (p - 1 + skins.length) % skins.length);
           }
       };

       const borderStyleClass = {
           '水': 'border-blue-400 shadow-[0_0_40px_rgba(96,165,250,0.3)]',
           '火': 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)]',
           '風': 'border-green-400 shadow-[0_0_40px_rgba(74,222,128,0.3)]',
           '土': 'border-amber-600 shadow-[0_0_40px_rgba(217,119,6,0.3)]',
           '光': 'border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.3)]',
           '暗': 'border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.3)]'
       }[char.element] || 'border-gray-700/50 shadow-[0_0_50px_rgba(0,0,0,0.6)]';

       const activeSkinUrl = getActiveCharImg(char);
       const isCurrentlyActive = currentSkinImgUrl === activeSkinUrl;

       const handleApplySkin = (e) => {
           e.stopPropagation();
           setGlobalStorage(prev => ({
               ...prev,
               charSkins: {
                   ...(prev.charSkins || {}),
                   [char.id]: currentSkinImgUrl === char.imageUrl ? null : currentSkinImgUrl
               }
           }));
       };

       return (
           <div className="fixed inset-0 z-[99999999] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md cursor-pointer animate-[popIn_0.2s_ease-out_forwards]"
                onClick={() => setFullImageView(null)}
                onContextMenu={(e) => { e.preventDefault(); setFullImageView(null); }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
           >
               <style dangerouslySetInnerHTML={{__html: `
                  @keyframes slideInRight { 0% { opacity: 0; transform: translateX(80px); } 100% { opacity: 1; transform: translateX(0); } }
                  @keyframes slideInLeft { 0% { opacity: 0; transform: translateX(-80px); } 100% { opacity: 1; transform: translateX(0); } }
                  .animate-slide-right { animation: slideInRight 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
                  .animate-slide-left { animation: slideInLeft 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
               `}} />
               
               <div className="absolute top-8 text-center z-50 pointer-events-none" onClick={e => e.stopPropagation()}>
                   <h3 className={`text-3xl font-bold tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${RARITY_MAP[RARITY_ORDER[globalStorage.charTiers[char.id]||0]]?.color || 'text-white'}`}>{TXT(char.name)}</h3>
                   {currentSkin.seriesname && (
                       <div className="text-indigo-300 mt-1 font-bold text-sm drop-shadow-md tracking-widest">
                           — {currentSkin.seriesname} —
                       </div>
                   )}
               </div>

               {/* 長方形立繪畫框 */}
               <div
                   className={`relative w-full max-w-[450px] h-[75vh] rounded-2xl flex items-center justify-center overflow-hidden border-2 bg-gray-900 ${borderStyleClass} mt-4`}
                   onClick={e => e.stopPropagation()}
               >
                   {/* 沉浸式模糊背景 */}
                   <div
                       className="absolute inset-0 bg-cover bg-center opacity-40 blur-xl scale-110 transition-all duration-300"
                       style={{ backgroundImage: `url(${currentSkinImgUrl})` }}
                   ></div>

                   {/* 主立繪圖片 */}
                   <img
                       key={currentSkinImgUrl}
                       src={currentSkinImgUrl}
                       className={`w-full h-full object-cover object-top relative z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] ${skinSlideDirection === 'right' ? 'animate-slide-right' : 'animate-slide-left'}`}
                       alt={currentSkin.name || currentSkin.seriesname}
                   />
                   
                   {/* 底部融合漸層 */}
                   <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent z-20 pointer-events-none"></div>

                   {/* 左右切換按鈕 */}
                   {skins.length > 1 && (
                       <>
                           <button
                               onClick={(e) => { e.stopPropagation(); setSkinSlideDirection('left'); setCurrentSkinIndex(p => (p - 1 + skins.length) % skins.length); }}
                               className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center z-30 border border-gray-600 transition-all backdrop-blur-sm shadow-lg group"
                           >
                               <ArrowRight className="rotate-180 text-gray-300 group-hover:text-white transition-colors" size={24} />
                           </button>
                           <button
                               onClick={(e) => { e.stopPropagation(); setSkinSlideDirection('right'); setCurrentSkinIndex(p => (p + 1) % skins.length); }}
                               className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center z-30 border border-gray-600 transition-all backdrop-blur-sm shadow-lg group"
                           >
                               <ArrowRight className="text-gray-300 group-hover:text-white transition-colors" size={24} />
                           </button>
                       </>
                   )}
               </div>

               <div className="absolute bottom-10 z-50 flex justify-center w-full pointer-events-none">
                   <button
                       onClick={handleApplySkin}
                       disabled={isCurrentlyActive}
                       className={`pointer-events-auto px-8 py-3 rounded-full font-bold text-lg shadow-lg border-2 transition-all ${isCurrentlyActive ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 hover:scale-105 hover:shadow-[0_0_20px_rgba(99,102,241,0.6)]'}`}
                   >
                       {isCurrentlyActive ? '已套用此造型' : '套用此造型'}
                   </button>
               </div>

               <button onClick={(e) => { e.stopPropagation(); setFullImageView(null); }} className="absolute top-6 right-6 text-white bg-gray-800 rounded-full p-2 hover:bg-gray-700 border border-gray-600 transition-colors shadow-lg z-50">
                   <X size={24}/>
               </button>
           </div>
       );
    })()}

    {dialog && (
        <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" 
             style={{animation: 'popIn 0.2s ease-out forwards'}}
             onClick={() => {
                 if (dialog.type !== 'confirm') {
                     if(dialog.onConfirm) dialog.onConfirm();
                     setDialog(null);
                 }
             }}>
           <div className="bg-gray-800 border-2 border-yellow-500 rounded-xl p-8 max-w-sm w-full text-center shadow-[0_0_30px_rgba(202,138,4,0.3)] relative" onClick={e => e.stopPropagation()}>
              <h3 className="text-2xl font-bold mb-4 text-white">{TXT(dialog.title)}</h3>
              <div className={`text-gray-300 whitespace-pre-wrap leading-relaxed ${dialog.type === 'confirm' ? 'mb-8' : 'mb-2'}`}>
                  {TXT(dialog.text)}
                  {dialog.extraData?.equips && (
                      <div className="flex justify-center gap-4 mt-4">
                          {dialog.extraData.equips.map((eq, i) => <React.Fragment key={i}>{renderEquipBox(eq)}</React.Fragment>)}
                      </div>
                  )}
                  {dialog.extraData?.equipBox && (
                      <div className="flex justify-center mt-4">
                          {renderEquipBox(dialog.extraData.equipBox)}
                      </div>
                  )}
                  {dialog.extraData?.mats && (
                      <div className="flex justify-center flex-wrap gap-4 mt-4">
                          {dialog.extraData.mats.map((mat, i) => <React.Fragment key={i}>{renderMatBox(mat)}</React.Fragment>)}
                      </div>
                  )}
              </div>
              
              {dialog.type === 'confirm' ? (
                 <div className="flex justify-center gap-4">
                    <button onClick={() => setDialog(null)} className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-white w-full">取消</button>
                    <button onClick={() => { if(dialog.onConfirm) dialog.onConfirm(); setDialog(null); }} className="px-6 py-2.5 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold text-white w-full">確認</button>
                 </div>
              ) : (
                 <div className="text-xs text-gray-500 mt-6 pointer-events-none">點擊空白關閉</div>
              )}
           </div>
        </div>
      )}
    </>
  );
}
