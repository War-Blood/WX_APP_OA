-- ============================================================
-- 清洗 2026年6月+ 的非标准 area 数据
-- 执行前会显示受影响行数，执行后可验证
-- ============================================================

START TRANSACTION;

-- 1. 阳江市平岗镇 → 广东省-阳江市-江城区
UPDATE daily_reports SET area = '广东省-阳江市-江城区'
WHERE area = '阳江市平岗镇' AND report_date >= '2026-06-01';

-- 2. 福建莆田 → 福建省-莆田市
UPDATE daily_reports SET area = '福建省-莆田市'
WHERE area = '福建莆田' AND report_date >= '2026-06-01';

-- 3. 安徽省亳州市坛城县 → 安徽省-亳州市-坛城县
UPDATE daily_reports SET area = '安徽省-亳州市-坛城县'
WHERE area = '安徽省亳州市坛城县' AND report_date >= '2026-06-01';

-- 4. 云南省大理市宾川县 → 云南省-大理白族自治州-宾川县
-- （原数据"大理市宾川县"地理有误：宾川属大理州非大理市）
UPDATE daily_reports SET area = '云南省-大理白族自治州-宾川县'
WHERE area = '云南省大理市宾川县' AND report_date >= '2026-06-01';

-- 5. 广东阳江 → 广东省-阳江市
UPDATE daily_reports SET area = '广东省-阳江市'
WHERE area = '广东阳江' AND report_date >= '2026-06-01';

-- 6. 宁夏自治区中卫市 → 宁夏回族自治区-中卫市
UPDATE daily_reports SET area = '宁夏回族自治区-中卫市'
WHERE area = '宁夏自治区中卫市' AND report_date >= '2026-06-01';

-- 7. 河北省邢台市巨鹿县 → 河北省-邢台市-巨鹿县
UPDATE daily_reports SET area = '河北省-邢台市-巨鹿县'
WHERE area = '河北省邢台市巨鹿县' AND report_date >= '2026-06-01';

-- 8. 广西百色田林 → 广西壮族自治区-百色市-田林县
UPDATE daily_reports SET area = '广西壮族自治区-百色市-田林县'
WHERE area = '广西百色田林' AND report_date >= '2026-06-01';

-- 9. 贵州省黔西南州 → 贵州省-黔西南布依族苗族自治州
UPDATE daily_reports SET area = '贵州省-黔西南布依族苗族自治州'
WHERE area = '贵州省黔西南州' AND report_date >= '2026-06-01';

-- 10. 新疆哈密淖毛湖 → 新疆维吾尔自治区-哈密市-伊吾县
UPDATE daily_reports SET area = '新疆维吾尔自治区-哈密市-伊吾县'
WHERE area = '新疆哈密淖毛湖' AND report_date >= '2026-06-01';

-- 11. 江苏省盐城市阜宁县 → 江苏省-盐城市-阜宁县
UPDATE daily_reports SET area = '江苏省-盐城市-阜宁县'
WHERE area = '江苏省盐城市阜宁县' AND report_date >= '2026-06-01';

-- 12. 江苏省扬州市扬州港 → 江苏省-扬州市
UPDATE daily_reports SET area = '江苏省-扬州市'
WHERE area = '江苏省扬州市扬州港' AND report_date >= '2026-06-01';

-- 13. 陆丰市 明阳叶片厂 → 广东省-汕尾市-陆丰市
UPDATE daily_reports SET area = '广东省-汕尾市-陆丰市'
WHERE area = '陆丰市 明阳叶片厂' AND report_date >= '2026-06-01';

-- 14. 辽宁铁岭昌图 → 辽宁省-铁岭市-昌图县
UPDATE daily_reports SET area = '辽宁省-铁岭市-昌图县'
WHERE area = '辽宁铁岭昌图' AND report_date >= '2026-06-01';

-- 15. 河北省承德市丰宁县鱼儿山镇 → 河北省-承德市-丰宁满族自治县
UPDATE daily_reports SET area = '河北省-承德市-丰宁满族自治县'
WHERE area = '河北省承德市丰宁县鱼儿山镇' AND report_date >= '2026-06-01';

-- 16. 江苏盐城大丰 → 江苏省-盐城市-大丰区
UPDATE daily_reports SET area = '江苏省-盐城市-大丰区'
WHERE area = '江苏盐城大丰' AND report_date >= '2026-06-01';

-- 17. 新疆省乌鲁木齐市 → 新疆维吾尔自治区-乌鲁木齐市
UPDATE daily_reports SET area = '新疆维吾尔自治区-乌鲁木齐市'
WHERE area = '新疆省乌鲁木齐市' AND report_date >= '2026-06-01';

-- 18. 新疆昌吉木垒县 → 新疆维吾尔自治区-昌吉回族自治州-木垒哈萨克自治县
UPDATE daily_reports SET area = '新疆维吾尔自治区-昌吉回族自治州-木垒哈萨克自治县'
WHERE area = '新疆昌吉木垒县' AND report_date >= '2026-06-01';

-- 19. 内蒙古自治区阿拉善盟阿拉善左旗敖伦布拉格镇 → 内蒙古自治区-阿拉善盟-阿拉善左旗
UPDATE daily_reports SET area = '内蒙古自治区-阿拉善盟-阿拉善左旗'
WHERE area = '内蒙古自治区阿拉善盟阿拉善左旗敖伦布拉格镇' AND report_date >= '2026-06-01';

-- 20. 广西钦州 → 广西壮族自治区-钦州市
UPDATE daily_reports SET area = '广西壮族自治区-钦州市'
WHERE area = '广西钦州' AND report_date >= '2026-06-01';

-- 21. 新疆省塔城地区 → 新疆维吾尔自治区-塔城地区
UPDATE daily_reports SET area = '新疆维吾尔自治区-塔城地区'
WHERE area = '新疆省塔城地区' AND report_date >= '2026-06-01';

-- 22. 辽宁葫芦岛市绥中县 → 辽宁省-葫芦岛市-绥中县
UPDATE daily_reports SET area = '辽宁省-葫芦岛市-绥中县'
WHERE area = '辽宁葫芦岛市绥中县' AND report_date >= '2026-06-01';

-- 23. 山西省朔州市 → 山西省-朔州市
UPDATE daily_reports SET area = '山西省-朔州市'
WHERE area = '山西省朔州市' AND report_date >= '2026-06-01';

-- 24. 新疆阿勒泰地区吉木乃县 → 新疆维吾尔自治区-阿勒泰地区-吉木乃县
UPDATE daily_reports SET area = '新疆维吾尔自治区-阿勒泰地区-吉木乃县'
WHERE area = '新疆阿勒泰地区吉木乃县' AND report_date >= '2026-06-01';

-- 25. 湖北省襄阳市 → 湖北省-襄阳市
UPDATE daily_reports SET area = '湖北省-襄阳市'
WHERE area = '湖北省襄阳市' AND report_date >= '2026-06-01';

-- 26. 江苏省南通市如东县 → 江苏省-南通市-如东县
UPDATE daily_reports SET area = '江苏省-南通市-如东县'
WHERE area = '江苏省南通市如东县' AND report_date >= '2026-06-01';

-- 27. 广西百色 → 广西壮族自治区-百色市
UPDATE daily_reports SET area = '广西壮族自治区-百色市'
WHERE area = '广西百色' AND report_date >= '2026-06-01';

-- 28. 汕尾明阳叶片厂 → 广东省-汕尾市
UPDATE daily_reports SET area = '广东省-汕尾市'
WHERE area = '汕尾明阳叶片厂' AND report_date >= '2026-06-01';

-- 29. 湖南衡阳祁东 → 湖南省-衡阳市-祁东县
UPDATE daily_reports SET area = '湖南省-衡阳市-祁东县'
WHERE area = '湖南衡阳祁东' AND report_date >= '2026-06-01';

-- 30. 湖南省株洲市炎陵县 → 湖南省-株洲市-炎陵县
UPDATE daily_reports SET area = '湖南省-株洲市-炎陵县'
WHERE area = '湖南省株洲市炎陵县' AND report_date >= '2026-06-01';

-- 31. 湖北省潜江市 → 湖北省-省直辖县级行政区划-潜江市
UPDATE daily_reports SET area = '湖北省-省直辖县级行政区划-潜江市'
WHERE area = '湖北省潜江市' AND report_date >= '2026-06-01';

-- 32. 新疆哈密淖毛湖镇 → 新疆维吾尔自治区-哈密市-伊吾县
UPDATE daily_reports SET area = '新疆维吾尔自治区-哈密市-伊吾县'
WHERE area = '新疆哈密淖毛湖镇' AND report_date >= '2026-06-01';

-- ============================================================
-- 验证：确认 6月数据中不再有无 '-' 的 area
-- ============================================================
SELECT '=== 清洗后验证 ===' AS info;
SELECT area, COUNT(*) cnt FROM daily_reports
WHERE area IS NOT NULL AND area != ''
  AND deleted_at IS NULL AND report_date >= '2026-06-01'
  AND area NOT LIKE '%-%'
GROUP BY area ORDER BY cnt DESC;

-- 显示每省人数
SELECT '=== 省份分布 ===' AS info;
SELECT SUBSTRING_INDEX(area, '-', 1) AS province, COUNT(DISTINCT user_id) AS user_count
FROM daily_reports
WHERE area IS NOT NULL AND area != ''
  AND deleted_at IS NULL AND report_date >= '2026-06-01'
  AND area LIKE '%-%'
GROUP BY province ORDER BY user_count DESC;

-- 如需回滚执行: ROLLBACK;
-- 确认无误后执行: COMMIT;
COMMIT;
