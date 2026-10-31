// Emoji used in game data -> line icon, so the UI draws icons instead of platform emoji.
// Anything not listed falls back to the emoji text.
export const GLYPH_MAP: Record<string, string> = {
  '⏭': 'skip-next', '⏱': 'timer-outline', '▶': 'play',
  '☁': 'weather-cloudy', '☄': 'meteor', '☠': 'skull-crossbones', '☢': 'radioactive', '☣': 'biohazard', '⚔': 'sword-cross', '⚙': 'cog', '⚠': 'alert', '⚡': 'flash',
  '⚰': 'coffin', '⛑': 'hard-hat', '✅': 'check-bold', '✏': 'pencil', '✨': 'shimmer', '❄': 'snowflake', '⬛': 'square', '⭐': 'star', '🌀': 'weather-tornado', '🌈': 'looks', '🌋': 'volcano', '🌑': 'moon-new',
  '🌙': 'moon-waning-crescent', '🌟': 'star-four-points', '🌡': 'thermometer', '🌫': 'weather-fog', '🌵': 'cactus', '🌸': 'flower', '🍀': 'clover',
  '🍄': 'mushroom', '🍇': 'fruit-grapes', '🍌': 'fruit-cherries', '🍑': 'fruit-pear', '🍕': 'pizza', '🍩': 'cookie', '🍳': 'egg-fried', '🎀': 'ribbon',
  '🎃': 'halloween', '🎓': 'school', '🎖': 'medal', '🎧': 'headphones', '🎨': 'palette', '🎩': 'hat-fedora', '🎭': 'drama-masks', '🎮': 'controller',
  '🎯': 'bullseye-arrow', '🎸': 'guitar-electric', '🏁': 'flag-checkered', '🏃': 'run', '🏅': 'medal-outline', '🏆': 'trophy', '🏴': 'flag', '🏴‍☠': 'skull-crossbones', '🐀': 'rodent', '🐉': 'paw', '🐍': 'snake', '🐙': 'jellyfish',
  '🐦': 'bird', '🐦‍⬛': 'bird', '🐸': 'emoticon-happy-outline', '🐺': 'dog', '🐾': 'paw', '👁': 'eye', '👂': 'ear-hearing', '👃': 'emoticon-outline', '👑': 'crown', '👒': 'hat-fedora',
  '👕': 'tshirt-crew', '👟': 'shoe-sneaker', '👨': 'account', '👨‍🍳': 'chef-hat', '👻': 'ghost', '👽': 'alien', '💀': 'skull', '💉': 'needle', '💊': 'pill', '💎': 'diamond-stone',
  '💥': 'flash-alert', '💨': 'weather-windy', '💾': 'content-save', '📡': 'radar', '📢': 'bullhorn', '📥': 'download', '📦': 'package-variant-closed', '🔌': 'power-plug', '🔍': 'magnify', '🔟': 'numeric-10-box',
  '🔥': 'fire', '🔦': 'flashlight', '🔧': 'wrench', '🔭': 'telescope', '🔱': 'pitchfork', '🕶': 'sunglasses', '🕷': 'spider', '🖥': 'monitor', '🗑': 'trash-can-outline',
  '🗡': 'sword', '🗺': 'map-outline', '🗿': 'account-circle', '🟫': 'terrain', '😈': 'emoticon-devil', '😡': 'emoticon-angry', '😷': 'face-mask', '🚀': 'rocket-launch', '🚩': 'flag',
  '🛠': 'tools', '🛡': 'shield', '🛢': 'barrel', '🛸': 'ufo', '🤖': 'robot', '🤠': 'hat-fedora', '🤫': 'volume-off', '🤿': 'diving-scuba-mask', '🥇': 'medal', '🥫': 'food-variant', '🥷': 'incognito',
  '🥽': 'glasses', '🦄': 'unicorn', '🦇': 'bat', '🦖': 'penguin', '🦘': 'rabbit', '🦟': 'bug', '🦴': 'bone', '🦵': 'foot-print', '🦾': 'arm-flex', '🧍': 'account', '🧙': 'wizard-hat',
  '🧛': 'bat', '🧟': 'virus', '🧠': 'brain', '🧢': 'hat-fedora', '🧣': 'ribbon', '🧥': 'tshirt-crew-outline', '🧪': 'flask', '🧯': 'fire-extinguisher',
  '🧰': 'toolbox', '🧱': 'wall', '🧲': 'magnet', '🧻': 'paper-roll', '🩸': 'water', '🩹': 'bandage', '🩺': 'stethoscope', '🪄': 'magic-staff', '🪐': 'orbit', '🪓': 'axe',
  '🪖': 'shield-half-full', '🪶': 'feather', '🪽': 'feather', '🫀': 'heart-pulse', '🫥': 'eye-off-outline', '🫧': 'circle-outline',
};
