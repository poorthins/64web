import React from 'react';

interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
}

export const IconDownload: React.FC<IconProps> = ({
  size = 29,
  color = 'currentColor',
  className = ''
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 29 29"
      fill="none"
      className={className}
    >
      <path
        d="M25.375 18.125V22.9583C25.375 23.5993 25.1204 24.214 24.6672 24.6672C24.214 25.1204 23.5993 25.375 22.9583 25.375H6.04167C5.40073 25.375 4.78604 25.1204 4.33283 24.6672C3.87961 24.214 3.625 23.5993 3.625 22.9583V18.125M8.45833 12.0833L14.5 18.125M14.5 18.125L20.5417 12.0833M14.5 18.125V3.625"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const IconUpload: React.FC<IconProps> = ({
  size = 29,
  color = 'currentColor',
  className = ''
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 29 29"
      fill="none"
      className={className}
    >
      <path
        d="M25.375 18.125V22.9583C25.375 23.5993 25.1204 24.214 24.6672 24.6672C24.214 25.1204 23.5993 25.375 22.9583 25.375H6.04167C5.40073 25.375 4.78604 25.1204 4.33283 24.6672C3.87961 24.214 3.625 23.5993 3.625 22.9583V18.125M20.5417 9.66667L14.5 3.625M14.5 3.625L8.45833 9.66667M14.5 3.625V18.125"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
