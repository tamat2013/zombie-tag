// Static, scaled-down drawing of a tile map (map lists, minimap).
import React, { useMemo } from 'react';
import { View } from 'react-native';
import type { GameMap } from '../types';
import { mergeTiles } from '../engine/map';
import { TILE } from '../engine/constants';
import { tileColors } from '../theme';

const DRAWN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const MapPreview = React.memo(function MapPreview({ map, width }: { map: GameMap; width: number }) {
  const k = width / (map.width * TILE); // mergeTiles returns world pixels
  const rects = useMemo(() => DRAWN.flatMap((code) => mergeTiles(map, code).map((r) => ({ ...r, code }))), [map]);
  return (
    <View style={{ width, height: map.height * TILE * k, backgroundColor: tileColors[0], borderRadius: 4, overflow: 'hidden' }}>
      {rects.map((r, i) => (
        <View
          key={i}
          style={{ position: 'absolute', left: r.x * k, top: r.y * k, width: r.w * k, height: r.h * k, backgroundColor: r.code === 10 ? '#888' : tileColors[r.code] }}
        />
      ))}
    </View>
  );
});
