import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { ProfileKind } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

export function ProfileMascot({
  profile,
  size = 24,
  color,
  knockout,
}: {
  profile: ProfileKind;
  size?: number;
  color?: string;
  knockout?: string;
}) {
  const theme = useTheme();
  const ink = color ?? theme.text;
  const hole = knockout ?? theme.background;

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      {profile === 'attendee' ? <ToucanGlyph ink={ink} hole={hole} /> : null}
      {profile === 'artist' ? <CondorGlyph ink={ink} hole={hole} /> : null}
      {profile === 'promoter' ? <JaguarGlyph ink={ink} hole={hole} /> : null}
    </Svg>
  );
}

function ToucanGlyph({ ink, hole }: { ink: string; hole: string }) {
  return (
    <G>
      <Path fill={ink} d="M23.2 21.6c3.4-1.4 7.2-5.2 7.8-7.2-1.6 4.6-4.4 9.4-9.2 10.6z" />
      <Ellipse cx="19.4" cy="21.4" rx="6.6" ry="7.4" fill={ink} />
      <Circle cx="18.4" cy="12.2" r="5.2" fill={ink} />
      <Path fill={ink} d="M1.6 14.2c0-2.4 7.2-5.6 16-4.4v8.8C8.6 19.8 1.6 16.8 1.6 14.2z" />
      <Path fill={ink} d="M3.2 16.6c0.6 1.8 6.4 3.2 14.4 2v-3.4c-5.8 0.8-11.4 0.4-14.4 1.4z" />
      <Rect x="4.2" y="13.5" width="9.2" height="1.2" rx="0.6" fill={hole} />
      <Circle cx="20.2" cy="11.2" r="1.3" fill={hole} />
    </G>
  );
}

function CondorGlyph({ ink, hole }: { ink: string; hole: string }) {
  return (
    <G>
      <Path
        fill={ink}
        d="M2 15.2C4.4 8.6 9.6 5.4 16 5.4s11.6 3.2 14 9.8c-4.2-3.2-8.6-2.4-14-2.4S6.2 12 2 15.2z"
      />
      <Path
        fill={ink}
        d="M3.2 16.4c3.2-1.2 7.2 0.8 12.8 0.8s9.6-2 12.8-0.8c-3.2 3.2-8 5.2-12.8 5.2S6.4 19.6 3.2 16.4z"
      />
      <Ellipse cx="16" cy="20" rx="4" ry="7.2" fill={ink} />
      <Circle cx="16" cy="8.4" r="3.1" fill={ink} />
      <Path fill={ink} d="M16 9.6c0 2.2-1.8 3.4-2.6 3.4 0.8-1.2 0.9-2.4 2.6-3.4z" />
      <Circle cx="16.8" cy="7.6" r="0.9" fill={hole} />
    </G>
  );
}

function JaguarGlyph({ ink, hole }: { ink: string; hole: string }) {
  return (
    <G>
      <Path fill={ink} d="M7.2 12.4 L9.4 3.6 L14.6 10 Z" />
      <Path fill={ink} d="M24.8 12.4 L22.6 3.6 L17.4 10 Z" />
      <Ellipse cx="16" cy="18.4" rx="10.2" ry="9.2" fill={ink} />
      <Circle cx="10.4" cy="16.2" r="1.25" fill={hole} />
      <Circle cx="21.6" cy="16.2" r="1.25" fill={hole} />
      <Circle cx="16" cy="22.6" r="1.15" fill={hole} />
      <Circle cx="12.2" cy="21.2" r="0.9" fill={hole} />
      <Circle cx="19.8" cy="21.2" r="0.9" fill={hole} />
      <Ellipse cx="12.2" cy="17.4" rx="1.35" ry="1.55" fill={hole} />
      <Ellipse cx="19.8" cy="17.4" rx="1.35" ry="1.55" fill={hole} />
      <Path fill={hole} d="M16 19.2 L14.4 21.4 H17.6 Z" />
    </G>
  );
}
