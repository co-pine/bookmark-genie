import { ExtensionSettings, BookmarkData } from "@/types";

export class AIAPIClient {
  private settings: ExtensionSettings;

  constructor(settings: ExtensionSettings) {
    this.settings = settings;
  }

  async searchBookmarks(
    query: string,
    bookmarks: BookmarkData[]
  ): Promise<BookmarkData[]> {
    if (!this.settings.aiConfig.apiKey) {
      // 如果没有API密钥，使用本地搜索
      return this.localSearch(query, bookmarks);
    }

    try {
      const response = await this.callAI(query, bookmarks);
      return this.parseAIResponse(response, bookmarks);
    } catch (error) {
      console.error("AI API调用失败，使用本地搜索:", error);
      return this.localSearch(query, bookmarks);
    }
  }

  // 新增：流式聊天方法
  async *streamChat(
    query: string,
    bookmarks: BookmarkData[]
  ): AsyncGenerator<string, void, unknown> {
    if (!this.settings.aiConfig.apiKey) {
      yield "抱歉，未配置AI API密钥，无法进行对话。请在设置中配置API密钥。";
      return;
    }

    try {
      const model =
        this.settings.aiConfig.model === "custom"
          ? this.settings.aiConfig.customModel
          : this.settings.aiConfig.model;

      // 智能处理书签数量，避免token超限
      let bookmarkContext = "";
      const maxTokensForBookmarks = Math.floor(
        this.settings.aiConfig.maxTokens * 0.6
      ); // 使用60%的token给书签
      const estimatedTokensPerBookmark = 50; // 估算每个书签约50个token
      const maxBookmarks = Math.min(
        bookmarks.length,
        Math.floor(maxTokensForBookmarks / estimatedTokensPerBookmark)
      );

      if (bookmarks.length <= maxBookmarks) {
        // 如果书签数量不多，全部包含
        bookmarkContext = bookmarks
          .map((b) => `- ${b.title} (${b.url})`)
          .join("\n");
      } else {
        // 如果书签太多，优先显示最近的和最相关的
        const recentBookmarks = bookmarks
          .sort((a, b) => b.dateAdded - a.dateAdded)
          .slice(0, Math.floor(maxBookmarks * 0.7)); // 70%显示最近的

        const remainingSlots = maxBookmarks - recentBookmarks.length;
        const relevantBookmarks = this.localSearch(query, bookmarks)
          .filter((b) => !recentBookmarks.find((rb) => rb.id === b.id))
          .slice(0, remainingSlots); // 30%显示最相关的

        const selectedBookmarks = [...recentBookmarks, ...relevantBookmarks];
        bookmarkContext = selectedBookmarks
          .map((b) => `- ${b.title} (${b.url})`)
          .join("\n");
      }

      const systemPrompt = `你是一个智能书签助手。用户总共有${
        bookmarks.length
      }个书签，以下是其中${Math.min(bookmarks.length, maxBookmarks)}个相关书签：

${bookmarkContext}

请根据用户的问题，结合这些书签信息进行回答。如果用户询问特定网站或内容，请推荐相关的书签(使用超链接语法)。如果需要的书签不在上述列表中，请告诉用户可以尝试更具体的关键词搜索。回答要使用 markdown 语法，同时简洁明了，有帮助。`;

      const requestBody = {
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: query,
          },
        ],
        max_tokens: this.settings.aiConfig.maxTokens,
        temperature: this.settings.aiConfig.temperature,
        stream: true, // 启用流式响应
      };

      const response = await fetch(
        `${this.settings.aiConfig.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.settings.aiConfig.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("无法获取响应流");
        }
        const { value } = await reader.read();
        const decoder = new TextDecoder();
        let errorMessage = decoder.decode(value, { stream: true });
        throw new Error(
          `API请求失败: ${response.status} ${response.statusText} ${errorMessage}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法获取响应流");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let isInThinking = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine === "" || trimmedLine === "data: [DONE]") continue;

            if (trimmedLine.startsWith("data: ")) {
              try {
                const jsonStr = trimmedLine.slice(6);
                const data = JSON.parse(jsonStr);
                const delta = data.choices?.[0]?.delta;

                // 处理思考内容 - 流式输出
                if (delta?.reasoning_content) {
                  if (!isInThinking) {
                    // 开始思考内容
                    yield "<thinking-start>";
                    isInThinking = true;
                  }
                  // 流式输出思考内容
                  yield delta.reasoning_content;
                }

                // 处理正常内容
                if (delta?.content) {
                  if (isInThinking) {
                    // 结束思考内容
                    yield "<thinking-end>";
                    isInThinking = false;
                  }
                  yield delta.content;
                }
              } catch (e) {
                // 忽略解析错误，继续处理下一行
                console.warn("解析SSE数据失败:", e);
              }
            }
          }
        }

        // 如果流结束时还在思考状态，结束思考
        if (isInThinking) {
          yield "<thinking-end>";
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error("流式聊天失败:", error);
      yield `抱歉，AI服务暂时不可用：${
        error instanceof Error ? error.message : "未知错误"
      }`;
    }
  }

  private async callAI(query: string, bookmarks: BookmarkData[]): Promise<any> {
    const model =
      this.settings.aiConfig.model === "custom"
        ? this.settings.aiConfig.customModel
        : this.settings.aiConfig.model;

    const bookmarkSummary = bookmarks
      .map((b) => ({
        id: b.id,
        title: b.title,
        url: b.url,
        description: b.description || "",
      }))
      .slice(0, 50); // 限制数量避免token过多

    const prompt = `你是一个智能书签助手。用户有以下书签：

${bookmarkSummary
  .map(
    (b, i) =>
      `${i + 1}. 标题: ${b.title}\n   URL: ${b.url}\n   描述: ${b.description}`
  )
  .join("\n\n")}

用户查询: "${query}"

请分析用户的查询意图，找出最相关的书签。返回一个JSON数组，包含相关书签的ID（按相关性排序）。

示例格式：
["bookmark_id_1", "bookmark_id_2", "bookmark_id_3"]

只返回JSON数组，不要其他解释。`;

    const requestBody = {
      model: model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: this.settings.aiConfig.maxTokens,
      temperature: this.settings.aiConfig.temperature,
    };

    const response = await fetch(
      `${this.settings.aiConfig.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.settings.aiConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private parseAIResponse(
    response: any,
    bookmarks: BookmarkData[]
  ): BookmarkData[] {
    try {
      const content = response.choices?.[0]?.message?.content;
      if (!content) return this.localSearch("", bookmarks);

      // 尝试解析JSON响应
      const bookmarkIds = JSON.parse(content.trim());
      if (!Array.isArray(bookmarkIds)) return this.localSearch("", bookmarks);

      // 根据AI返回的ID顺序重新排列书签
      const result: BookmarkData[] = [];
      bookmarkIds.forEach((id) => {
        const bookmark = bookmarks.find((b) => b.id === id);
        if (bookmark) result.push(bookmark);
      });

      return result;
    } catch (error) {
      console.error("解析AI响应失败:", error);
      return this.localSearch("", bookmarks);
    }
  }

  private localSearch(
    query: string,
    bookmarks: BookmarkData[]
  ): BookmarkData[] {
    if (!query) return bookmarks.slice(0, 10);

    const searchTerms = query
      .toLowerCase()
      .split(" ")
      .filter((term) => term.length > 0);

    return bookmarks
      .map((bookmark) => ({
        bookmark,
        score: this.calculateRelevanceScore(
          bookmark,
          searchTerms,
          query.toLowerCase()
        ),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.bookmark)
      .slice(0, 10);
  }

  private calculateRelevanceScore(
    bookmark: BookmarkData,
    searchTerms: string[],
    fullQuery: string
  ): number {
    let score = 0;
    const title = bookmark.title.toLowerCase();
    const url = bookmark.url.toLowerCase();
    const description = (bookmark.description || "").toLowerCase();

    // 完整查询匹配（高分）
    if (title.includes(fullQuery)) score += 100;
    if (description.includes(fullQuery)) score += 80;
    if (url.includes(fullQuery)) score += 60;

    // 单词匹配
    searchTerms.forEach((term) => {
      if (title.includes(term)) score += 50;
      if (description.includes(term)) score += 30;
      if (url.includes(term)) score += 20;

      // 标题开头匹配（额外加分）
      if (title.startsWith(term)) score += 20;
    });

    // 时间因子（新书签稍微加分）
    const daysSinceAdded =
      (Date.now() - bookmark.dateAdded) / (1000 * 60 * 60 * 24);
    if (daysSinceAdded < 7) score += 5;
    if (daysSinceAdded < 30) score += 2;

    return score;
  }
}
