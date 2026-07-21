import React from 'react';

interface IconProps {
  color?: string;
  name?: string;
  size?: number;
}

export function AntDesign({ color, name, size }: IconProps) {
  return <span data-color={color} data-icon={name} data-size={size} />;
}
