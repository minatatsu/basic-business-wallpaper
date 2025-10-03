import { useState } from "react";
import { Button } from "./ui/button";
import { Download, Loader2 } from "lucide-react";
import { FormData } from "../types";
import { downloadMultipleImages } from "../utils/imageGenerator";
import { toast } from "sonner@2.0.3";
import { Progress } from "./ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface DownloadButtonProps {
  formData: FormData;
  isValid: boolean;
}

export function DownloadButton({ formData, isValid }: DownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDownload = async () => {
    if (!isValid) {
      toast.error("入力内容を確認してください", {
        description:
          "必須項目をすべて入力し、テンプレートを1つ以上選択してください。",
      });
      return;
    }

    if (formData.selected_templates.length > 3) {
      setShowConfirm(true);
      return;
    }

    await executeDownload();
  };

  const executeDownload = async () => {
    setIsGenerating(true);
    setProgress(0);
    setShowConfirm(false);

    try {
      await downloadMultipleImages(
        formData.selected_templates,
        formData,
        (current, total) => {
          setProgress((current / total) * 100);
        },
      );

      toast.success("ダウンロード完了！", {
        description: `${formData.selected_templates.length}個の背景画像をダウンロードしました。`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("ダウンロードに失敗しました", {
        description: "もう一度お試しください。",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <Button
          onClick={handleDownload}
          disabled={!isValid || isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              ダウンロード
              {formData.selected_templates.length > 1 &&
                ` (${formData.selected_templates.length}個)`}
            </>
          )}
        </Button>

        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              {Math.round(progress)}% 完了
            </p>
          </div>
        )}
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>複数の画像を生成します</AlertDialogTitle>
            <AlertDialogDescription>
              {formData.selected_templates.length}個の背景画像を生成します。
              処理に時間がかかる場合があります。続けますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={executeDownload}>
              続ける
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
