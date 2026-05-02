CREATE POLICY "Users can view own ais_records" ON ais_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ais_records" ON ais_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ais_records" ON ais_records
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own dark_periods" ON dark_periods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dark_periods" ON dark_periods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dark_periods" ON dark_periods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dark_periods" ON dark_periods
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own upload_batches" ON upload_batches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own upload_batches" ON upload_batches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own upload_batches" ON upload_batches
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own upload_batches" ON upload_batches
  FOR DELETE USING (auth.uid() = user_id);
