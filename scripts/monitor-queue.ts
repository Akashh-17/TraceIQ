import { auditEventsQueue } from '../src/config/queue';

let previousCompletedCount = 0;
let isFirstRun = true;

console.log('📊 Starting TraceIQ Queue Monitor...');
console.log('=======================================');

setInterval(async () => {
  try {
    // Fetch queue statistics
    const waiting = await auditEventsQueue.getWaitingCount();
    const active = await auditEventsQueue.getActiveCount();
    const completed = await auditEventsQueue.getCompletedCount();
    const failed = await auditEventsQueue.getFailedCount();

    // Calculate events processed in the last second
    const processedPerSec = isFirstRun ? 0 : completed - previousCompletedCount;
    previousCompletedCount = completed;
    isFirstRun = false;

    // Output formatted stats to terminal
    process.stdout.write('\x1Bc'); // Clear console slightly for dashboard effect
    console.log('📈 TraceIQ Performance Dashboard (BullMQ)');
    console.log('=======================================');
    console.log(`⏳ Queue Length (Waiting)  : ${waiting}`);
    console.log(`⚙️  Active Workers (Jobs)   : ${active}`);
    console.log(`✅ Total Completed         : ${completed}`);
    console.log(`❌ Total Failed            : ${failed}`);
    console.log('---------------------------------------');
    console.log(`🚀 Worker Throughput       : ${processedPerSec} events/sec`);
    console.log('=======================================');

  } catch (error) {
    console.error('Error fetching queue metrics:', error);
  }
}, 1000);
