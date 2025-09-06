import React, { useState, useEffect } from "react";
import { ExtensionSettings } from "@/types";
import { StorageManager } from "@/utils/storage";
import { Settings, Save, Key, Zap, Palette, Keyboard } from "lucide-react";
import { cn } from "@/utils/cn";

// 定义baseUrl到模型列表的映射
type ModelMapType = {
  [key: string]: string[];
  "https://open.bigmodel.cn/api/paas/v4": string[];
  "https://api.openai.com/v1": string[];
  "https://api.deepseek.com/v1": string[];
  "custom": string[];
};

const BASE_URL_MODEL_MAP: ModelMapType = {
  "https://open.bigmodel.cn/api/paas/v4": ["glm-4-flash", "glm-4-plus", "glm-4-air", "glm-4-airx", "glm-4-long", "glm-4v-plus", "glm-4.5-air"],
  "https://api.openai.com/v1": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-4o"],
  "https://api.deepseek.com/v1": ["deepseek-chat", "deepseek-coder"],
  "custom": []
};

// 获取指定baseUrl的默认模型
const getDefaultModel = (baseUrl: string): string => {
  return BASE_URL_MODEL_MAP[baseUrl]?.[0] || "";
};

interface SettingsPageProps {
  onClose: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "ai">("general");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await StorageManager.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error("加载设置失败:", error);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      await StorageManager.saveSettings(settings);

      // 立即应用主题变化
      document.documentElement.classList.remove("light", "dark");

      if (settings.theme === "system") {
        // 跟随系统主题
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        document.documentElement.classList.add(prefersDark ? "dark" : "light");
      } else {
        // 使用固定主题
        document.documentElement.classList.add(settings.theme);
      }

      // 显示保存成功提示
      setTimeout(() => setIsSaving(false), 1000);
    } catch (error) {
      console.error("保存设置失败:", error);
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">设置</h1>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: "general", label: "常规设置", icon: Palette },
          { id: "ai", label: "AI配置", icon: Zap },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={cn(
              "flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === "general" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-3">主题设置</h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="theme"
                    value="system"
                    checked={settings.theme === "system"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        theme: e.target.value as "light" | "dark" | "system",
                      })
                    }
                    className="text-primary"
                  />
                  <span className="text-sm">跟随系统</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={settings.theme === "dark"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        theme: e.target.value as "light" | "dark" | "system",
                      })
                    }
                    className="text-primary"
                  />
                  <span className="text-sm">深色主题</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={settings.theme === "light"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        theme: e.target.value as "light" | "dark" | "system",
                      })
                    }
                    className="text-primary"
                  />
                  <span className="text-sm">浅色主题</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <Keyboard className="w-4 h-4 mr-2" />
                快捷键设置
              </h3>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm">打开AI助手</span>
                  <code className="px-2 py-1 bg-background rounded text-xs">
                    Ctrl+K (Mac: Cmd+K)
                  </code>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  快捷键可在Chrome扩展管理页面中修改
                </p>
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.autoSync}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      autoSync: e.target.checked,
                    })
                  }
                  className="text-primary"
                />
                <span className="text-sm">自动同步书签</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                启用后将自动收集新书签的元数据
              </p>
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <Key className="w-4 h-4 mr-2" />
                API配置
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    API Base URL
                  </label>
                  <select
                    value={settings.aiConfig.baseUrl}
                    onChange={(e) => {
                      const newBaseUrl = e.target.value;
                      
                      // 获取默认模型（列表的第一个）
                      const defaultModel = getDefaultModel(newBaseUrl);
                      
                      // 如果是自定义URL，保留当前模型
                      if (newBaseUrl === "custom") {
                        setSettings({
                          ...settings,
                          aiConfig: {
                            ...settings.aiConfig,
                            baseUrl: newBaseUrl,
                          },
                        });
                      } else {
                        // 否则设置为默认模型并清除自定义模型
                        setSettings({
                          ...settings,
                          aiConfig: {
                            ...settings.aiConfig,
                            baseUrl: newBaseUrl,
                            model: defaultModel,
                            customModel: "",
                          },
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  >
                    <option value="https://open.bigmodel.cn/api/paas/v4">
                      智谱AI (GLM)
                    </option>
                    <option value="https://api.openai.com/v1">OpenAI</option>
                    <option value="https://api.deepseek.com/v1">
                      DeepSeek
                    </option>
                    <option value="custom">自定义</option>
                  </select>
                  {settings.aiConfig.baseUrl === "custom" && (
                    <input
                      type="text"
                      placeholder="输入自定义API Base URL"
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      onChange={(e) => {
                        const customUrl = e.target.value;
                        setSettings({
                          ...settings,
                          aiConfig: {
                            ...settings.aiConfig,
                            baseUrl: customUrl,
                          },
                        });
                      }}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    API密钥
                  </label>
                  <input
                    type="password"
                    value={settings.aiConfig.apiKey}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        aiConfig: {
                          ...settings.aiConfig,
                          apiKey: e.target.value,
                        },
                      })
                    }
                    placeholder={
                      settings.aiConfig.baseUrl.includes("bigmodel")
                        ? "输入您的智谱AI API密钥"
                        : "输入您的API密钥"
                    }
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    用于AI智能搜索功能，留空将使用本地搜索算法
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    模型选择
                  </label>
                  <select
                    value={
                      settings.aiConfig.model === "custom"
                        ? "custom"
                        : settings.aiConfig.model
                    }
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setSettings({
                          ...settings,
                          aiConfig: { ...settings.aiConfig, model: "custom" },
                        });
                      } else {
                        setSettings({
                          ...settings,
                          aiConfig: {
                            ...settings.aiConfig,
                            model: e.target.value,
                            customModel: "",
                          },
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm mb-2"
                  >
                    {/* 根据当前baseUrl显示对应的模型列表 */}
                    {settings.aiConfig.baseUrl.includes("bigmodel") ? (
                      // 智谱AI模型
                      BASE_URL_MODEL_MAP["https://open.bigmodel.cn/api/paas/v4"].map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))
                    ) : settings.aiConfig.baseUrl.includes("deepseek") ? (
                      // DeepSeek模型
                      BASE_URL_MODEL_MAP["https://api.deepseek.com/v1"].map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))
                    ) : settings.aiConfig.baseUrl.includes("openai") ? (
                      // OpenAI模型
                      BASE_URL_MODEL_MAP["https://api.openai.com/v1"].map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))
                    ) : settings.aiConfig.baseUrl === "custom" ? (
                      // 自定义URL时显示所有可能的模型选项
                      <>
                        <optgroup label="智谱AI (GLM)">
                          {BASE_URL_MODEL_MAP["https://open.bigmodel.cn/api/paas/v4"].map((model) => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </optgroup>
                        <optgroup label="OpenAI">
                          {BASE_URL_MODEL_MAP["https://api.openai.com/v1"].map((model) => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </optgroup>
                        <optgroup label="DeepSeek">
                          {BASE_URL_MODEL_MAP["https://api.deepseek.com/v1"].map((model) => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </optgroup>
                      </>
                    ) : (
                      // 未知的baseUrl，显示OpenAI的模型作为默认
                      BASE_URL_MODEL_MAP["https://api.openai.com/v1"].map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))
                    )}
                    <option value="custom">自定义模型</option>
                  </select>

                  {settings.aiConfig.model === "custom" && (
                    <input
                      type="text"
                      value={settings.aiConfig.customModel}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          aiConfig: {
                            ...settings.aiConfig,
                            customModel: e.target.value,
                          },
                        })
                      }
                      placeholder="输入自定义模型名称，如: glm-4-0520"
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      最大令牌数
                    </label>
                    <input
                      type="number"
                      value={settings.aiConfig.maxTokens}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          aiConfig: {
                            ...settings.aiConfig,
                            maxTokens: parseInt(e.target.value),
                          },
                        })
                      }
                      min="100"
                      max="4000"
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      温度
                    </label>
                    <input
                      type="number"
                      value={settings.aiConfig.temperature}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          aiConfig: {
                            ...settings.aiConfig,
                            temperature: parseFloat(e.target.value),
                          },
                        })
                      }
                      min="0"
                      max="2"
                      step="0.1"
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className={cn(
            "w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors",
            isSaving
              ? "bg-green-600 text-white"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "已保存" : "保存设置"}</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
