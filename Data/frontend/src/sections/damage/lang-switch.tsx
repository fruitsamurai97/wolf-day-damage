'use client';

import { m } from 'framer-motion';
import { usePopover } from 'minimal-shared/hooks';

import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';

import { FlagIcon } from 'src/components/flag-icon';
import { CustomPopover } from 'src/components/custom-popover';
import { varTap, varHover, transitionTap } from 'src/components/animate';

import { useLang } from './i18n';

// ----------------------------------------------------------------------

const LANGS = [
  { value: 'en' as const, label: 'English', countryCode: 'GB' },
  { value: 'de' as const, label: 'Deutsch', countryCode: 'DE' },
];

export function LangSwitch() {
  const { open, anchorEl, onClose, onOpen } = usePopover();
  const { lang, setLang } = useLang();

  const current = LANGS.find((l) => l.value === lang) ?? LANGS[0];

  return (
    <>
      <IconButton
        component={m.button}
        whileTap={varTap(0.96)}
        whileHover={varHover(1.04)}
        transition={transitionTap()}
        aria-label="Language"
        onClick={onOpen}
        sx={(theme) => ({
          p: 0,
          width: 40,
          height: 40,
          ...(open && { bgcolor: theme.vars.palette.action.selected }),
        })}
      >
        <FlagIcon code={current.countryCode} />
      </IconButton>

      <CustomPopover open={open} anchorEl={anchorEl} onClose={onClose}>
        <MenuList sx={{ width: 160, minHeight: 72 }}>
          {LANGS.map((option) => (
            <MenuItem
              key={option.value}
              selected={option.value === lang}
              onClick={() => {
                setLang(option.value);
                onClose();
              }}
            >
              <FlagIcon code={option.countryCode} />
              {option.label}
            </MenuItem>
          ))}
        </MenuList>
      </CustomPopover>
    </>
  );
}
