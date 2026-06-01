import { LANGUAGE_ZH_CN, LANGUAGE_EN_US } from './constants';

// 处理客户端参数 language 的值，默认值为 LANGUAGE_ZH_CN
export function normalizeLanguage(language: string | undefined): string {
    if (language === LANGUAGE_ZH_CN || language === LANGUAGE_EN_US) {
        return language;
    }
    return LANGUAGE_ZH_CN;
}
