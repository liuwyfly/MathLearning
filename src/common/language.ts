import { LANGUAGE_ZH_CN, LANGUAGE_EN_US } from './constants';

export function normalizeLanguage(language: string | undefined): string {
    if (language === LANGUAGE_ZH_CN || language === LANGUAGE_EN_US) {
        return language;
    }
    return LANGUAGE_ZH_CN;
}
