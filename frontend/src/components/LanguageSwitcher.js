import React from 'react';
import { useTranslation } from 'react-i18next';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { Button } from './ui/button';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const changeLanguage = (lng) => i18n.changeLanguage(lng);
  const current = i18n.language.startsWith('en') ? '🇺🇸' : '🇹🇷';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-8 h-8 p-0">
          {current}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => changeLanguage('tr')}>🇹🇷 Türkçe</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => changeLanguage('en')}>🇺🇸 English</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcher;

