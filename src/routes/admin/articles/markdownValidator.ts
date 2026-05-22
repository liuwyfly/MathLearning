import { FastifyInstance, FastifyRequest } from "fastify";
import { LANGUAGE_EN_US, LANGUAGE_ZH_CN } from "../../../common/constants";

export class MarkdownValidator {
    private request: FastifyRequest;

    constructor(_fastify: FastifyInstance, request: FastifyRequest) {
        this.request = request;
    }

    validate(): string | null {
        const articleIdError = this.validateArticleId();
        if (articleIdError) {
            return articleIdError;
        }

        const languageError = this.validateLanguage();
        if (languageError) {
            return languageError;
        }

        return null;
    }

    private validateArticleId(): string | null {
        const { article_id } = this.request.query as { article_id?: string };
        if (article_id) {
            const aid = Number(article_id);
            if (isNaN(aid) || !Number.isInteger(aid) || aid <= 0) {
                return "Invalid article_id";
            }
        }
        return null;
    }

    private validateLanguage(): string | null {
        const { language } = this.request.query as { language?: string };
        if (language && language.trim() !== "") {
            const validLanguages = [LANGUAGE_ZH_CN, LANGUAGE_EN_US];
            if (!validLanguages.includes(language.trim())) {
                return `Invalid language, must be one of: ${validLanguages.join(", ")}`;
            }
        }
        return null;
    }
}
