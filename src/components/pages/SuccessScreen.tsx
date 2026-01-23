import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../common';

interface SuccessScreenProps {
    onClose: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ onClose }) => {
    return (
        <div className="w-[450px] p-10 flex flex-col items-center justify-center bg-white min-h-[600px]">
            <div className="bg-green-50 p-6 rounded-full mb-6 border border-green-100 animate-in zoom-in-50">
                <CheckCircle2 className="text-green-500 w-16 h-16" />
            </div>
            <h2 className="text-2xl font-black text-slate-800">Готово!</h2>
            <p className="text-slate-500 text-center mt-3">Ссылка улетела в Google Sheets.</p>
            <Button
                onClick={onClose}
                size="lg"
                className="mt-10 w-full"
            >
                Закрыть
            </Button>
        </div>
    );
};

export default SuccessScreen;
