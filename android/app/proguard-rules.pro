# Keep Room entities & generated implementations
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**

# Keep BillingClient classes for optional lesson packs
-keep class com.android.vending.billing.**

# Keep Glance widget receivers
-keep class app.mindloop.widget.** { *; }
