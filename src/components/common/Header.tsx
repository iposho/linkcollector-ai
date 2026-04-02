import React from 'react';
import { ChevronLeft, Globe, Settings as SettingsIcon, FolderOpen, CircleHelp } from 'lucide-react';

interface HeaderProps {
    title: string;
    onBack?: () => void;
    onSettings?: () => void;
    onOpenList?: () => void;
    onHelp?: () => void;
    rightContent?: React.ReactNode;
    variant?: 'default' | 'primary';
}

export const Header: React.FC<HeaderProps> = ({
    title,
    onBack,
    onSettings,
    onOpenList,
    onHelp,
    rightContent,
    variant = 'primary'
}) => {
    const bgColor = variant === 'primary' ? 'bg-indigo-600' : 'bg-slate-900';
    const ringOffset = variant === 'primary' ? 'focus-visible:ring-offset-indigo-600' : 'focus-visible:ring-offset-slate-900';
    const iconButtonClass =
        `p-2 rounded-xl transition-colors hover:bg-white/20 ` +
        `focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 ${ringOffset}`;

    return (
        <header className={`px-5 py-4 ${bgColor} text-white flex items-center gap-3 shadow-lg relative z-10`}>
            {onBack ? (
                <button
                    onClick={onBack}
                    className={`p-2 rounded-lg transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 ${ringOffset}`}
                    aria-label="Назад"
                    type="button"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            ) : (
                <Globe className="w-5 h-5 opacity-80" />
            )}

            <h1 className="font-black text-lg flex-1">{title}</h1>

            {rightContent}

            {onHelp && (
                <button
                    onClick={onHelp}
                    className={iconButtonClass}
                    aria-label="Справка"
                    title="Справка"
                    type="button"
                >
                    <CircleHelp className="w-5 h-5" />
                </button>
            )}

            {onOpenList && (
                <button
                    onClick={onOpenList}
                    className={iconButtonClass}
                    title="Мои ссылки"
                    aria-label="Открыть список ссылок"
                    type="button"
                >
                    <FolderOpen className="w-5 h-5" />
                </button>
            )}

            {onSettings && (
                <button
                    onClick={onSettings}
                    className={iconButtonClass}
                    aria-label="Настройки"
                    type="button"
                >
                    <SettingsIcon className="w-5 h-5" />
                </button>
            )}
        </header>
    );
};

export default Header;
