import React from 'react';
import { useTranslation } from 'react-i18next';

const Logo = ({ onBadgeClick, onLogoClick, superMode }) => {
  const { t } = useTranslation();

  return (
    <div className="logo-container">
      <svg
        width="42"
        height="42"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        onClick={onLogoClick}
        style={{ cursor: onLogoClick ? 'pointer' : 'default' }}
      >
        <path d="M14 3V7C14 7.26522 14.1054 7.51957 14.2929 7.70711C14.4804 7.89464 14.7348 8 15 8H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 21H7C6.46957 21 5.96086 20.7893 5.58579 20.4142C5.21071 20.0391 5 19.5304 5 19V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H14L19 8V19C19 19.5304 18.7893 20.0391 18.4142 20.4142C18.0391 20.7893 17.5304 21 17 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 11H9V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 14.5C9 13.5056 9.48281 12.8716 10.3392 12.3392C11.1957 11.8067 12 11.5 12 11.5C12 11.5 12.8043 11.8067 13.6608 12.3392C14.5172 12.8716 15 13.5056 15 14.5V18H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span
        className="logo-text"
        onClick={onLogoClick}
        style={{ cursor: onLogoClick ? 'pointer' : 'default' }}
      >
        CV Builder
      </span>
      <div className="badge-container">
        <button className="demo-badge rotating-badge" onClick={onBadgeClick}>
          <span className="beta-text">{superMode ? 'Admin' : t('demoBadge')}</span> |
          <span className="info-icon">ℹ︎</span>
          <span className="badge-tooltip">{t('giveFeedback')}</span>
        </button>
      </div>
    </div>
  );
};

export default Logo;
