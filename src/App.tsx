import { useState } from "react";
import { useFormData } from "./hooks/useFormData";
import { InputForm } from "./components/InputForm";
import { TemplateSelector } from "./components/TemplateSelector";
import { BackgroundPreview } from "./components/BackgroundPreview";
import { DownloadButton } from "./components/DownloadButton";
import { AuthGuard } from "./components/AuthGuard";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { ScrollArea } from "./components/ui/scroll-area";
import { Card } from "./components/ui/card";
import { RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/ui/alert-dialog";

export default function App() {
  const { formData, updateField, resetForm, isValid } = useFormData();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | undefined>();

  const handleTemplateToggle = (templateId: string) => {
    const current = formData.selected_templates;
    const newSelection = current.includes(templateId)
      ? current.filter((id) => id !== templateId)
      : [...current, templateId];

    updateField("selected_templates", newSelection);

    // Update active template if needed
    if (!newSelection.includes(activeTemplate || "")) {
      setActiveTemplate(newSelection[0]);
    }
  };

  const handleReset = () => {
    resetForm();
    setShowResetConfirm(false);
    setActiveTemplate(undefined);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Toaster />

        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div>
              <h1>MTG背景ジェネレーター</h1>
              <p className="text-sm text-muted-foreground mt-1">
                オンラインMTG用の背景画像を簡単に作成
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Form */}
            <div className="space-y-8">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">入力フォーム</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResetConfirm(true)}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    リセット
                  </Button>
                </div>
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="pr-4 space-y-8">
                    <InputForm formData={formData} onUpdate={updateField} />

                    <TemplateSelector
                      selectedTemplates={formData.selected_templates}
                      onToggle={handleTemplateToggle}
                    />
                  </div>
                </ScrollArea>
              </Card>

              <Card className="p-6">
                <DownloadButton formData={formData} isValid={isValid()} />
              </Card>
            </div>

            {/* Right Column - Preview */}
            <div className="lg:sticky lg:top-8 h-fit">
              <Card className="p-6">
                <BackgroundPreview
                  formData={formData}
                  activeTemplate={activeTemplate}
                  onTemplateChange={setActiveTemplate}
                />
              </Card>

              {/* Instructions */}
              <Card className="p-6 mt-4 bg-muted/50">
                <h4 className="mb-3">使い方</h4>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li>1. 姓名と所属情報を入力してください</li>
                  <li>2. お好みのテンプレートを選択してください</li>
                  <li>3. プレビューで確認してください</li>
                  <li>4. ダウンロードボタンで画像を保存できます</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-4">
                  ※ 複数選択時はZIPファイルでダウンロードされます
                </p>
              </Card>
            </div>
          </div>
        </main>

        {/* Reset Confirmation Dialog */}
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>入力内容をリセットしますか？</AlertDialogTitle>
              <AlertDialogDescription>
                すべての入力内容が削除されます。この操作は取り消せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>
                リセット
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthGuard>
  );
}
