import React from 'react';
import { ChevronLeft, Globe, Settings as SettingsIcon, FolderOpen } from 'lucide-react';

interface HeaderProps {
    title: string;
    onBack?: () => void;
    onSettings?: () => void;
    onOpenList?: () => void;
    rightContent?: React.ReactNode;
    variant?: 'default' | 'primary';
}

export const Header: React.FC<HeaderProps> = ({
    title,
    onBack,
    onSettings,
    onOpenList,
    rightContent,
    variant = 'primary'
}) => {
    const bgColor = variant === 'primary' ? 'bg-indigo-600' : 'bg-slate-900';

    return (
        <header className={`px-5 py-4 ${bgColor} text-white flex items-center gap-3 shadow-lg relative z-10`}>
            {onBack ? (
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Назад"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            ) : (
                <Globe className="w-5 h-5 opacity-80" />
            )}

            <h1 className="font-black text-lg flex-1">{title}</h1>

            {rightContent}

            {onOpenList && (
                <button
                    onClick={onOpenList}
                    className="p-2 hover:bg-white/20 rounded-xl transition-all"
                    title="Мои ссылки"
                    aria-label="Открыть список ссылок"
                >
                    <FolderOpen className="w-5 h-5" />
                </button>
            )}

            {onSettings && (
                <button
                    onClick={onSettings}
                    className="p-2 hover:bg-white/20 rounded-xl transition-all"
                    aria-label="Настройки"
                >
                    <SettingsIcon className="w-5 h-5" />
                </button>
            )}
        </header>
    );
};

export default Header;
