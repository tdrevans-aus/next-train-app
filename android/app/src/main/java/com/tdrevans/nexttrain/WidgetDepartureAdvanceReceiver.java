package com.tdrevans.nexttrain;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class WidgetDepartureAdvanceReceiver extends BroadcastReceiver {

  @Override
  public void onReceive(Context context, Intent intent) {
    // goAsync keeps the process alive until the network fetch completes.
    PendingResult pendingResult = goAsync();
    CommuteRefreshService.refreshAll(context, pendingResult::finish);
  }
}
