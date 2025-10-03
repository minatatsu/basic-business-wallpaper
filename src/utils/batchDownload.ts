/**
 * 一括ダウンロードの並列制御
 * メモリ枯渇やレース条件を防ぐ
 */

export interface Task {
  readonly name: string;
  readonly run: () => Promise<void>;
}

export interface TaskResult {
  readonly name: string;
  readonly status: "success" | "error";
  readonly error?: Error;
  readonly duration?: number;
}

/**
 * 並列数を制限してタスクを実行
 * @param tasks 実行するタスクのリスト
 * @param concurrency 同時実行数（デフォルト: 4）
 * @returns 各タスクの実行結果
 */
export async function runWithConcurrency(
  tasks: ReadonlyArray<Task>,
  concurrency: number = 4,
): Promise<TaskResult[]> {
  const results: TaskResult[] = [];
  const queue = [...tasks];
  const actualConcurrency = Math.max(1, Math.min(concurrency, tasks.length));

  console.log(
    `[BatchDownload] Starting ${tasks.length} tasks with concurrency ${actualConcurrency}`,
  );

  const workers: Array<Promise<void>> = [];

  for (let i = 0; i < actualConcurrency; i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const task = queue.shift();
          if (!task) break;

          const startTime = performance.now();
          console.log(
            `[BatchDownload] [Worker ${i}] Starting task: ${task.name}`,
          );

          try {
            await task.run();
            const duration = performance.now() - startTime;
            results.push({
              name: task.name,
              status: "success",
              duration,
            });
            console.log(
              `[BatchDownload] [Worker ${i}] ✓ Task completed: ${task.name} (${duration.toFixed(0)}ms)`,
            );
          } catch (error) {
            const duration = performance.now() - startTime;
            const err =
              error instanceof Error ? error : new Error(String(error));
            results.push({
              name: task.name,
              status: "error",
              error: err,
              duration,
            });
            console.error(
              `[BatchDownload] [Worker ${i}] ✗ Task failed: ${task.name} (${duration.toFixed(0)}ms)`,
              err,
            );
            // エラーが発生してもループを継続（他のタスクは実行）
          }
        }
        console.log(
          `[BatchDownload] [Worker ${i}] Finished all assigned tasks`,
        );
      })(),
    );
  }

  await Promise.all(workers);

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  console.log(`[BatchDownload] All tasks completed:`, {
    total: results.length,
    success: successCount,
    error: errorCount,
    totalDuration: `${totalDuration.toFixed(0)}ms`,
    avgDuration: `${(totalDuration / results.length).toFixed(0)}ms`,
  });

  // エラーがあった場合は詳細をログ出力
  if (errorCount > 0) {
    console.error(
      `[BatchDownload] Failed tasks:`,
      results.filter((r) => r.status === "error"),
    );
  }

  return results;
}

/**
 * 署名URLの有効性をチェック
 * @param url チェックするURL
 * @returns 有効な場合true
 */
export async function checkUrlValidity(url: string): Promise<boolean> {
  // base64 data URLは常に有効
  if (url.startsWith("data:")) {
    return true;
  }

  try {
    const response = await fetch(url, {
      method: "HEAD",
      mode: "cors",
    });
    return response.ok;
  } catch (error) {
    console.error(
      "[BatchDownload] URL validity check failed:",
      url.substring(0, 100),
      error,
    );
    return false;
  }
}

/**
 * 並列数を動的に調整
 * メモリ使用量などに応じて調整する（将来の拡張用）
 */
export function getOptimalConcurrency(): number {
  // 画像サイズ (1920x1080) とメモリを考慮
  // 1画像あたり約8MBのメモリを想定
  // 同時に4-6画像まで安全
  const defaultConcurrency = 4;

  // Performance API でメモリ情報が取得できる場合は利用
  // @ts-ignore
  if (performance.memory) {
    // @ts-ignore
    const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
    const memoryUsageRatio = usedJSHeapSize / jsHeapSizeLimit;

    if (memoryUsageRatio > 0.8) {
      console.warn(
        "[BatchDownload] High memory usage detected, reducing concurrency",
      );
      return 2;
    } else if (memoryUsageRatio > 0.6) {
      return 3;
    }
  }

  return defaultConcurrency;
}
