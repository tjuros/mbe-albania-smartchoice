type UpsRuntimeResult = {
  name: string;
  price: number | null;
  possible: boolean;
  details: string[];
  serviceType: "MBE Economy" | "MBE Express";
  status: "ok" | "surcharge" | "no";
  warning?: string;
};

type Direction = "outbound" | "inbound";
type ShipmentType = "documents" | "parcel";

const UPS_FUEL_RATE = 0.4075;
const UPS_FUEL_EFFECTIVE = "29/06/2026";
const UPS_MARKER = "UPS 2025 published tariff";
const UPS_VOLUMETRIC_DIVISOR = 5000;

const DOC_WEIGHTS = [0.5,1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0];
const PACKAGE_WEIGHTS = [0.5,1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0,5.5,6.0,6.5,7.0,7.5,8.0,8.5,9.0,9.5,10.0,11.0,12.0,13.0,14.0,15.0,16.0,17.0,18.0,19.0,20.0,21.0,22.0,23.0,24.0,25.0,26.0,27.0,28.0,29.0,30.0,31.0,32.0,33.0,34.0,35.0,40.0,45.0,50.0,55.0,60.0,65.0,70.0];

const EXPORT_LETTER_RATES = [66.65,68.3,70.35,77.45,79.9,72.15,75.9,79.4,85.0,94.65,97.75,104.9];
const IMPORT_LETTER_RATES = [74.45,76.0,78.0,86.15,88.85,80.25,83.5,88.3,91.3,99.05,101.6,108.9];
const EXPORT_DOC_RATES = [[66.65,68.3,70.8,77.45,79.9,72.15,75.9,79.4,85.0,94.65,97.75,104.9],[78.3,83.6,90.1,96.25,113.65,88.65,93.85,98.7,107.15,116.95,122.65,133.95],[89.5,97.3,106.8,113.65,133.4,102.05,110.2,117.05,129.25,138.6,146.1,162.75],[100.6,110.8,123.25,131.05,153.25,115.5,126.95,135.4,151.1,160.2,169.2,191.85],[111.7,124.4,139.65,148.5,173.25,128.95,143.45,153.85,173.1,181.5,192.35,220.9],[120.8,133.4,150.2,160.25,190.55,138.05,154.35,167.35,187.7,198.55,210.75,240.25],[130.1,142.55,160.8,171.65,208.2,147.35,164.8,180.95,202.35,215.75,229.05,259.5],[139.3,151.9,171.55,183.35,225.35,156.5,175.6,194.45,216.95,232.75,247.35,278.8],[148.35,161.0,182.1,194.9,242.75,165.7,186.3,208.2,231.45,249.7,265.75,298.1],[157.65,170.3,192.8,206.55,260.15,175.1,197.1,221.4,246.25,266.8,284.25,317.45]];
const IMPORT_DOC_RATES = [[74.45,76.0,78.65,86.15,88.85,80.25,83.5,88.3,91.3,99.05,101.6,108.9],[87.15,93.05,100.2,107.05,126.45,98.55,103.4,109.85,115.45,122.65,127.6,139.05],[99.75,108.1,118.6,126.45,148.5,113.6,121.65,130.25,139.05,145.25,151.5,169.15],[111.9,123.45,136.8,145.8,170.6,128.7,139.95,150.85,162.55,167.6,175.65,199.25],[124.35,138.2,155.05,165.15,192.65,143.7,158.2,171.15,186.15,190.1,199.8,229.25],[134.7,148.5,166.8,178.05,212.05,153.85,170.15,186.15,201.95,207.95,218.75,249.25],[144.7,158.75,178.75,191.05,231.4,164.2,181.95,201.15,217.75,225.65,237.8,269.4],[155.05,169.05,190.55,204.1,250.8,174.2,193.7,216.2,233.5,243.6,257.05,289.5],[165.15,179.3,202.45,216.8,270.1,184.5,205.5,231.4,249.0,261.55,275.95,309.5],[175.55,189.4,214.15,229.8,289.55,194.85,217.5,246.5,264.9,279.4,295.0,329.55]];
const EXPORT_PACKAGE_RATES = [[95.85,98.85,101.1,106.1,122.75,103.65,105.6,110.6,115.05,123.3,128.5,134.95],[107.55,113.8,119.75,125.0,143.7,120.35,122.55,130.8,137.6,145.55,152.9,165.5],[118.65,127.45,135.8,142.35,164.1,134.65,139.2,149.7,159.6,166.95,176.05,193.4],[129.85,140.95,151.9,159.65,184.5,149.15,155.9,168.3,181.45,188.45,199.2,221.4],[140.65,154.6,167.75,177.2,204.7,163.55,172.35,187.3,203.35,209.95,222.25,249.4],[151.4,164.65,179.9,189.4,222.5,173.1,185.05,200.0,217.95,227.0,240.75,269.65],[162.2,174.75,192.1,201.3,240.6,182.65,197.55,212.45,232.75,243.95,259.2,290.0],[172.7,184.9,204.15,213.45,258.15,192.45,210.4,225.0,247.2,261.35,277.4,310.4],[183.3,195.0,216.2,225.5,276.15,202.2,223.1,237.55,261.75,278.1,295.8,330.65],[194.2,205.2,228.3,237.5,294.25,211.9,235.8,250.2,276.55,295.15,314.4,351.0],[203.0,215.3,238.95,248.6,309.5,220.35,247.35,261.55,289.0,310.35,330.05,368.5],[212.05,225.35,249.4,259.8,325.0,229.05,259.05,273.25,301.65,325.25,345.9,386.5],[221.25,235.65,260.15,270.8,340.3,237.7,270.75,284.85,314.3,340.4,361.85,404.25],[230.35,245.85,270.85,281.8,355.65,246.4,282.45,296.4,326.95,355.55,377.8,422.05],[239.55,256.15,281.55,292.85,370.95,255.0,294.15,307.9,339.55,370.7,393.75,439.8],[248.65,266.35,292.25,303.85,386.35,263.65,305.85,319.45,352.2,385.85,409.7,457.55],[257.75,276.55,302.95,314.9,401.7,272.3,317.5,331.0,364.75,400.95,425.7,475.35],[266.95,286.8,313.65,325.95,417.05,280.95,329.2,342.5,377.35,416.1,441.65,493.1],[276.05,297.0,324.4,336.95,432.4,289.6,340.9,354.05,389.95,431.25,457.6,510.85],[285.15,307.25,335.1,348.0,447.75,298.25,352.6,365.6,402.5,446.35,473.55,528.65],[302.0,322.7,352.2,367.25,470.5,312.8,370.9,384.1,424.8,467.8,496.85,552.8],[318.85,338.2,369.25,386.5,493.3,327.35,389.15,402.65,447.0,489.2,520.15,576.95],[335.7,353.7,386.35,405.75,516.05,341.9,407.45,421.15,469.2,510.6,543.45,601.1],[352.55,369.15,403.4,425.0,538.85,356.45,425.7,439.7,491.45,532.0,566.8,625.25],[369.4,384.65,420.5,444.25,561.6,371.0,444.0,458.2,513.65,553.4,590.1,649.4],[386.25,400.15,437.55,463.5,584.4,385.55,462.25,476.75,535.85,574.8,613.45,673.55],[403.1,415.6,454.65,482.75,607.15,400.1,480.55,495.25,558.1,596.2,636.75,697.7],[419.95,431.1,471.7,502.0,629.95,414.65,498.8,513.8,580.3,617.6,660.1,721.85],[436.8,446.6,488.8,521.25,652.7,429.2,517.1,532.3,602.5,639.0,683.4,746.0],[453.65,462.05,505.85,540.5,675.5,443.75,535.35,550.85,624.75,660.4,706.75,770.15],[470.5,477.55,522.95,559.75,698.25,458.3,553.65,569.35,646.95,681.8,730.05,794.3],[487.35,493.05,540.0,579.0,721.05,472.85,571.9,587.9,669.15,703.2,753.4,818.45],[504.2,508.5,557.1,598.25,743.8,487.4,590.2,606.4,691.4,724.6,776.7,842.6],[521.05,524.0,574.15,617.5,766.6,501.95,608.45,624.95,713.6,746.0,800.05,866.75],[537.9,539.5,591.25,636.75,789.35,516.5,626.75,643.45,735.8,767.4,823.35,890.9],[554.75,554.95,608.3,656.0,812.15,531.05,645.0,662.0,758.05,788.8,846.7,915.05],[571.6,570.45,625.4,675.25,834.9,545.6,663.3,680.5,780.25,810.2,870.0,939.2],[588.45,585.95,642.45,694.5,857.7,560.15,681.55,699.05,802.45,831.6,893.35,963.35],[605.3,601.4,659.55,713.75,880.45,574.7,699.85,717.55,824.7,853.0,916.65,987.5],[622.15,616.9,676.6,733.0,903.25,589.25,718.1,736.1,846.9,874.4,940.0,1011.65],[639.0,632.4,693.7,752.25,926.0,603.8,736.4,754.6,869.1,895.8,963.3,1035.8],[655.85,647.85,710.75,771.5,948.8,618.35,754.65,773.15,891.35,917.2,986.65,1059.95],[672.7,663.35,727.85,790.75,971.55,632.9,772.95,791.65,913.55,938.6,1009.95,1084.1],[667.0,676.8,794.8,817.65,1031.65,689.7,817.8,827.25,955.1,1020.2,1081.35,1217.5],[683.95,692.3,811.85,836.9,1054.4,704.25,836.4,845.35,977.25,1041.65,1104.65,1241.65],[700.8,707.75,828.95,856.15,1077.2,718.8,854.7,863.85,999.65,1063.0,1127.85,1266.05],[771.85,779.4,921.7,950.45,1192.25,790.05,948.05,957.5,1109.8,1170.4,1245.25,1382.3],[842.85,850.9,1014.8,1044.7,1307.25,861.65,1041.05,1051.55,1219.95,1277.7,1362.5,1498.75],[913.9,922.45,1107.75,1139.0,1422.35,933.1,1134.25,1145.45,1329.9,1384.85,1479.8,1615.05],[984.95,993.95,1200.8,1233.45,1537.3,1004.5,1227.5,1239.15,1439.95,1492.25,1597.15,1731.45],[1055.8,1065.45,1293.9,1327.55,1652.5,1076.2,1320.5,1332.95,1550.1,1599.5,1714.75,1847.95],[1126.75,1137.05,1386.75,1421.85,1767.4,1147.7,1413.6,1426.65,1660.35,1706.6,1832.0,1964.2],[1197.8,1208.65,1479.75,1516.1,1882.65,1219.05,1506.8,1520.3,1770.45,1813.9,1949.35,2080.75]];
const IMPORT_PACKAGE_RATES = [[106.95,110.05,112.2,118.1,121.5,115.45,116.6,123.25,124.15,130.1,130.45,140.15],[119.65,126.55,133.3,139.05,142.4,133.65,135.2,145.5,148.2,153.85,154.6,171.75],[132.25,141.7,151.05,158.35,162.45,149.9,153.4,166.65,171.65,176.45,177.75,200.85],[144.3,156.85,168.55,177.6,182.65,166.1,171.75,187.65,195.3,199.1,201.15,230.1],[156.8,171.8,186.3,197.1,202.75,182.05,190.1,208.4,218.95,221.75,224.7,259.05],[168.55,183.25,199.95,210.55,220.35,192.8,204.35,222.3,234.6,239.75,243.0,280.0],[180.3,194.35,213.35,224.05,238.1,203.6,218.0,236.4,250.5,257.7,261.7,301.2],[192.35,205.85,226.75,237.5,255.85,214.3,232.2,250.45,266.1,275.9,280.3,322.25],[204.15,217.3,240.35,250.8,273.5,225.1,246.15,264.3,281.8,293.95,298.85,343.25],[215.9,228.15,253.65,264.3,291.25,235.95,260.15,278.35,297.65,312.1,317.45,364.45],[226.2,239.5,265.45,276.7,306.65,245.45,272.9,291.15,311.1,327.95,333.45,382.95],[236.35,250.8,277.05,289.0,321.85,255.05,285.75,303.95,324.55,343.8,349.45,401.45],[246.5,262.0,289.0,301.55,337.1,264.9,298.65,317.05,338.3,359.95,365.75,419.9],[256.65,273.15,301.0,314.1,352.25,274.45,311.55,330.1,352.05,376.1,382.0,438.4],[266.8,284.3,313.0,326.65,367.45,284.05,324.45,343.2,365.85,392.25,398.2,456.9],[276.95,295.45,324.95,339.2,382.6,293.6,337.35,356.3,379.6,408.4,414.45,475.45],[287.1,306.6,336.95,351.75,397.8,303.15,350.25,369.4,393.4,424.55,430.65,493.95],[297.25,317.75,348.95,364.3,412.95,312.7,363.15,382.5,407.15,440.7,446.9,512.45],[307.4,328.9,360.9,376.85,428.15,322.25,376.05,395.6,420.95,456.85,463.1,531.0],[317.55,340.05,372.9,389.4,443.3,331.8,388.95,408.7,434.7,473.0,479.35,549.5],[336.15,357.25,391.65,410.95,465.85,347.75,409.4,429.15,458.85,495.8,502.85,574.55],[354.75,374.45,410.4,432.5,488.35,363.7,429.85,449.6,482.95,518.6,526.35,599.6],[373.35,391.65,429.1,454.05,510.9,379.65,450.3,470.05,507.1,541.4,549.85,624.65],[391.95,408.85,447.85,475.6,533.4,395.6,470.75,490.5,531.2,564.2,573.35,649.7],[410.55,426.05,466.6,497.15,555.95,411.55,491.2,510.95,555.35,587.0,596.85,674.75],[429.15,443.25,485.3,518.7,578.45,427.5,511.65,531.4,579.45,609.8,620.35,699.8],[447.75,460.45,504.05,540.25,601.0,443.45,532.1,551.85,603.6,632.6,643.85,724.85],[466.35,477.65,522.8,561.8,623.5,459.4,552.55,572.3,627.7,655.4,667.35,749.9],[484.95,494.85,541.5,583.35,646.05,475.35,573.0,592.75,651.85,678.2,690.85,774.95],[503.55,512.05,560.25,604.9,668.55,491.3,593.45,613.2,675.95,701.0,714.35,800.0],[522.15,529.25,579.0,626.45,691.1,507.25,613.9,633.65,700.1,723.8,737.85,825.05],[540.75,546.45,597.7,648.0,713.6,523.2,634.35,654.1,724.2,746.6,761.35,850.1],[559.35,563.65,616.45,669.55,736.15,539.15,654.8,674.55,748.35,769.4,784.85,875.15],[577.95,580.85,635.2,691.1,758.65,555.1,675.25,695.0,772.45,792.2,808.35,900.2],[596.55,598.05,653.9,712.65,781.2,571.05,695.7,715.45,796.6,815.0,831.85,925.25],[615.15,615.25,672.65,734.2,803.7,587.0,716.15,735.9,820.7,837.8,855.35,950.3],[633.75,632.45,691.4,755.75,826.25,602.95,736.6,756.35,844.85,860.6,878.85,975.35],[652.35,649.65,710.1,777.3,848.75,618.9,757.05,776.8,868.95,883.4,902.35,1000.4],[670.95,666.85,728.85,798.85,871.3,634.85,777.5,797.25,893.1,906.2,925.85,1025.45],[689.55,684.05,747.6,820.4,893.8,650.8,797.95,817.7,917.2,929.0,949.35,1050.5],[708.15,701.25,766.3,841.95,916.35,666.75,818.4,838.15,941.35,951.8,972.85,1075.55],[726.75,718.45,785.05,863.5,938.85,682.7,838.85,858.6,965.45,974.6,996.35,1100.6],[745.35,735.65,803.8,885.05,961.4,698.65,859.3,879.05,989.6,997.4,1019.85,1125.65],[742.95,753.5,883.2,909.9,1022.05,768.7,902.6,920.7,1028.05,1078.2,1092.65,1264.7],[762.2,770.7,901.95,931.55,1044.55,784.65,923.05,941.4,1052.2,1101.0,1116.15,1289.8],[780.8,787.85,920.7,953.1,1067.05,800.8,943.5,961.75,1076.4,1123.45,1139.65,1314.7],[860.1,867.6,1024.05,1058.1,1180.95,880.5,1046.15,1066.0,1194.95,1236.9,1258.05,1435.95],[938.9,947.25,1127.65,1162.95,1294.95,960.1,1149.0,1170.4,1313.2,1350.35,1376.65,1556.5],[1018.3,1026.85,1230.7,1268.0,1408.85,1039.65,1251.85,1274.95,1431.85,1463.75,1495.2,1677.6],[1097.45,1106.5,1334.0,1372.75,1522.85,1119.35,1354.55,1379.3,1550.35,1577.1,1613.9,1798.55],[1176.45,1186.25,1437.4,1477.7,1636.95,1199.2,1457.25,1483.65,1668.8,1690.45,1732.45,1919.45],[1255.5,1265.75,1540.75,1582.6,1750.75,1278.7,1560.2,1588.1,1787.45,1803.8,1851.05,2040.3],[1334.8,1345.4,1644.05,1687.9,1864.85,1358.4,1662.85,1692.5,1905.9,1917.15,1969.6,2161.4]];
const EXPORT_ABOVE_70_PER_KG = [17.11,17.26,21.13,21.65,26.89,17.41,21.52,21.71,25.29,25.91,27.84,29.72];
const IMPORT_ABOVE_70_PER_KG = [19.06,19.22,23.48,24.11,26.64,19.4,23.75,24.17,27.22,27.38,28.13,30.87];
const EXPORT_ABOVE_70_MINIMUM = [1197.8,1208.65,1479.75,1516.1,1882.65,1219.05,1506.8,1520.3,1770.45,1813.9,1949.35,2080.75];
const IMPORT_ABOVE_70_MINIMUM = [1334.8,1345.4,1644.05,1687.9,1864.85,1358.4,1662.85,1692.5,1905.9,1917.15,1969.6,2161.4];

const EXPORT_DOC_DISCOUNTS = [0.655,0.655,0.655,0.655,0.655,0.655,0.655,0.671,0.655,0.655,0.655,0.655];
const IMPORT_DOC_DISCOUNTS = [0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6];
const EXPORT_LETTER_DISCOUNTS = [0.655,0.655,0.655,0.655,0.655,0.655,0.655,0.655,0.655,0.655,0.655,0.655];
const IMPORT_LETTER_DISCOUNTS = [0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6];
const EXPORT_PACKAGE_DISCOUNTS = [[0.675,0.6287,0.598,0.503,0.4097,0.333,0.27,0.27],[0.675,0.675,0.652,0.6115,0.5265,0.4405,0.3835,0.381],[0.675,0.675,0.6493,0.605,0.5447,0.4717,0.44,0.4353],[0.675,0.675,0.6423,0.591,0.526,0.445,0.4047,0.4027],[0.675,0.65,0.627,0.549,0.471,0.367,0.332,0.331],[0.675,0.675,0.643,0.5655,0.4825,0.378,0.3305,0.327],[0.675,0.6707,0.6433,0.5653,0.491,0.3857,0.3637,0.3567],[0.675,0.6517,0.6393,0.561,0.4813,0.385,0.3583,0.357],[0.675,0.675,0.675,0.639,0.6115,0.5495,0.5195,0.5155],[0.675,0.675,0.672,0.6287,0.6012,0.5165,0.471,0.4665],[0.675,0.675,0.662,0.6447,0.591,0.498,0.4557,0.4523],[0.675,0.675,0.6747,0.6457,0.5977,0.498,0.4317,0.4307]];
const IMPORT_PACKAGE_DISCOUNTS = [[0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6],[0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6],[0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6],[0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6],[0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6],[0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6],[0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6],[0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6],[0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6],[0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6],[0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6],[0.6,0.6,0.6,0.6,0.6,0.6,0.6,0.6]];

const EXPORT_ZONES: Record<string, number> = {"AF":10,"FI":3,"DZ":11,"AS":11,"AD":7,"AO":12,"AI":11,"AG":11,"AR":10,"AM":8,"AW":11,"AU":10,"AT":2,"AZ":8,"PT":3,"BS":11,"BH":10,"BD":11,"BB":11,"BY":8,"BE":2,"BZ":11,"BJ":12,"BM":11,"BT":11,"BO":10,"BQ":11,"BA":7,"BW":12,"BR":10,"VG":11,"BN":11,"BG":3,"BF":12,"BI":12,"DE":2,"KH":11,"CM":12,"CA":8,"IC":8,"CV":12,"KY":11,"CF":12,"TD":12,"CL":10,"CN":8,"CO":10,"KM":12,"CG":12,"CD":12,"CK":12,"CR":10,"CI":12,"HR":3,"CW":11,"CY":7,"CZ":3,"DK":3,"DJ":12,"DM":11,"DO":11,"EC":10,"EG":11,"SV":10,"GQ":12,"ER":12,"EE":3,"ET":12,"FK":12,"FJ":12,"FR":3,"GF":12,"PF":12,"GA":12,"GE":8,"GH":12,"GI":7,"GR":1,"GL":12,"GD":11,"GP":12,"GU":12,"GT":10,"GG":7,"GN":12,"GW":12,"GY":12,"HT":11,"HN":10,"HK":8,"HU":3,"IS":7,"IN":10,"ID":10,"IQ":10,"IE":3,"IM":7,"IL":10,"IT":1,"JM":11,"JP":10,"JE":7,"JO":10,"KZ":8,"KE":12,"KI":12,"KR":10,"XK":7,"KW":10,"KG":8,"LA":11,"LV":3,"LB":10,"LS":12,"LR":12,"LY":10,"LI":7,"LT":3,"LU":2,"MO":8,"MK":7,"MG":12,"MW":12,"MY":10,"MV":11,"ML":12,"MT":7,"MH":12,"MQ":12,"MR":12,"MU":12,"YT":12,"MX":10,"FM":12,"MD":8,"MC":7,"MN":11,"ME":7,"MS":11,"MA":11,"MZ":12,"MM":11,"NA":12,"NP":11,"NL":3,"NC":12,"NZ":10,"NI":10,"NE":12,"NG":12,"MP":12,"NO":3,"OM":10,"PK":11,"PW":12,"PA":10,"PG":12,"PY":10,"PE":10,"PH":11,"PL":3,"PR":11,"QA":10,"RE":12,"RO":3,"RW":12,"BL":11,"SH":12,"KN":11,"LC":11,"MF":11,"PM":12,"VC":11,"WS":12,"SM":7,"ST":12,"SA":10,"SN":12,"RS":7,"SC":12,"SL":12,"SG":8,"SX":11,"SK":3,"SI":3,"SB":12,"SO":12,"ZA":12,"SS":12,"ES":3,"LK":11,"SD":12,"SR":12,"SZ":12,"SE":3,"CH":2,"SY":10,"TW":8,"TJ":8,"TZ":12,"TH":10,"TL":12,"TG":12,"TO":12,"TT":11,"TN":11,"TR":8,"TM":8,"TC":11,"TV":12,"UG":12,"UA":8,"AE":10,"GB":3,"US":8,"UY":10,"VI":11,"UZ":8,"VU":12,"VA":7,"VE":10,"VN":10,"WF":12,"YE":10,"ZM":12,"ZW":12};
const IMPORT_ZONES: Record<string, number> = {"AF":10,"FI":3,"DZ":11,"AS":11,"AO":12,"AI":11,"AG":11,"AR":10,"AM":8,"AW":11,"AU":10,"AT":2,"AZ":8,"PT":3,"BS":11,"BH":10,"BD":11,"BB":11,"BY":8,"BE":2,"BZ":11,"BJ":12,"BM":11,"BT":11,"BO":10,"BQ":11,"BA":7,"BW":12,"BR":10,"VG":11,"BN":11,"BG":3,"BF":12,"BI":12,"DE":2,"KH":11,"CM":12,"CA":8,"CV":12,"KY":11,"CF":12,"TD":12,"CL":10,"CN":8,"CO":10,"KM":12,"CG":12,"CD":12,"CK":12,"CR":10,"CI":12,"HR":3,"CW":11,"CY":7,"CZ":3,"DK":3,"DJ":12,"DM":11,"DO":11,"EC":10,"EG":11,"SV":10,"GQ":12,"ER":12,"EE":3,"ET":12,"FK":12,"FJ":12,"FR":3,"GF":12,"PF":12,"GA":12,"GE":8,"GH":12,"GI":7,"GR":1,"GL":12,"GD":11,"GP":12,"GU":12,"GT":10,"GG":7,"GN":12,"GW":12,"GY":12,"HT":11,"HN":10,"HK":8,"HU":3,"IS":7,"IN":10,"ID":10,"IQ":10,"IE":3,"IM":7,"IL":10,"IT":1,"JM":11,"JP":10,"JE":7,"JO":10,"KZ":8,"KE":12,"KI":12,"KR":10,"KW":10,"KG":8,"LA":11,"LV":3,"LB":10,"LS":12,"LR":12,"LY":10,"LI":7,"LT":3,"LU":2,"MO":8,"MK":7,"MG":12,"MW":12,"MY":10,"MV":11,"ML":12,"MT":7,"MH":12,"MQ":12,"MR":12,"MU":12,"YT":12,"MX":10,"MD":8,"MC":7,"MN":11,"ME":7,"MS":11,"MA":11,"MZ":12,"MM":11,"NA":12,"NP":11,"NL":3,"NC":12,"NZ":10,"NI":10,"NE":12,"NG":12,"MP":12,"NO":3,"OM":10,"PK":11,"PW":12,"PA":10,"PG":12,"PY":10,"PE":10,"PH":11,"PL":3,"PR":11,"QA":10,"RE":12,"RO":3,"RW":12,"BL":11,"SH":12,"KN":11,"LC":11,"MF":11,"VC":11,"WS":12,"SM":7,"ST":12,"SA":10,"SN":12,"RS":7,"SC":12,"SL":12,"SG":8,"SX":11,"SK":3,"SI":3,"SB":12,"SO":12,"ZA":12,"SS":12,"ES":3,"LK":11,"SD":12,"SR":12,"SZ":12,"SE":3,"CH":2,"SY":10,"TW":8,"TJ":8,"TZ":12,"TH":10,"TL":12,"TG":12,"TO":12,"TT":11,"TN":11,"TR":8,"TM":8,"TC":11,"UG":12,"UA":8,"AE":10,"GB":3,"US":8,"UY":10,"VI":11,"UZ":8,"VU":12,"VA":7,"VE":10,"VN":10,"YE":10,"ZM":12,"ZW":12};
const AMBIGUOUS_EXPORT_ZONES = new Set(["FO", "RU"]);
const AMBIGUOUS_IMPORT_ZONES = new Set(["RU"]);

let currentDirection: Direction = "outbound";
let currentCountry = "AL";
let currentShipmentType: ShipmentType = "parcel";

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const toNumber = (value: string) => Number(value.replace(/,/g, ".")) || 0;
const euro = (value: number) => `€${value.toFixed(2)}`;

function isRuntimeResult(value: unknown): value is UpsRuntimeResult {
  return !!value && typeof value === "object" && "name" in value && "details" in value && "serviceType" in value;
}

function isAlbanian() {
  return document.body.textContent?.includes("Rivendos") ?? false;
}

function currentPostalCode() {
  const input = document.getElementById("dhl-zip-code");
  return input instanceof HTMLInputElement ? input.value.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
}

function spainZone(baseZone: number) {
  if (currentCountry !== "ES") return { zone: baseZone, special: false };
  const postalCode = currentPostalCode();
  const special = /^(35|38|51|52)/.test(postalCode);
  return { zone: special ? 8 : 3, special };
}

function inputValues(placeholder: string) {
  return Array.from(document.querySelectorAll<HTMLInputElement>(`input[placeholder="${placeholder}"]`))
    .map((input) => toNumber(input.value));
}

function domesticChargeableWeight() {
  const weights = inputValues("kg");
  const actual = weights.reduce((sum, value) => sum + value, 0);
  if (currentShipmentType === "documents") return round2(actual);

  const dimensions = inputValues("cm");
  let volume = 0;
  for (let index = 0; index < dimensions.length; index += 3) {
    const length = dimensions[index] ?? 0;
    const width = dimensions[index + 1] ?? 0;
    const height = dimensions[index + 2] ?? 0;
    volume += (length * width * height) / UPS_VOLUMETRIC_DIVISOR;
  }
  return round2(Math.max(actual, volume));
}

function chargeableWeight(result: UpsRuntimeResult) {
  for (const detail of result.details) {
    const match = detail.match(/(?:Chargeable weight|Pesha e faturueshme):\s*([\d.,]+)\s*kg/i);
    if (match) return toNumber(match[1]);
  }
  return domesticChargeableWeight();
}

function firstRateAtOrAbove(weights: number[], rates: number[][], weight: number, zone: number) {
  const normalizedWeight = Math.max(0.5, weight);
  const index = weights.findIndex((candidate) => candidate >= normalizedWeight - 1e-9);
  if (index < 0) return null;
  return rates[index]?.[zone - 1] ?? null;
}

function packageDiscountIndex(weight: number) {
  if (weight <= 1) return 0;
  if (weight <= 3) return 1;
  if (weight <= 5) return 2;
  if (weight <= 10) return 3;
  if (weight <= 20) return 4;
  if (weight <= 40) return 5;
  if (weight <= 70) return 6;
  return 7;
}

function resolveZone() {
  const zones = currentDirection === "outbound" ? EXPORT_ZONES : IMPORT_ZONES;
  const ambiguous = currentDirection === "outbound" ? AMBIGUOUS_EXPORT_ZONES : AMBIGUOUS_IMPORT_ZONES;
  if (ambiguous.has(currentCountry)) return { zone: null, specialSpain: false, ambiguous: true };
  const baseZone = zones[currentCountry];
  if (!baseZone) return { zone: null, specialSpain: false, ambiguous: false };
  const resolved = spainZone(baseZone);
  return { zone: resolved.zone, specialSpain: resolved.special, ambiguous: false };
}

function officialTariff(shipmentType: ShipmentType, weight: number, zone: number) {
  const zoneIndex = zone - 1;
  if (shipmentType === "documents") {
    if (weight > 5) return null;
    if (weight <= 0.5) {
      const rates = currentDirection === "outbound" ? EXPORT_LETTER_RATES : IMPORT_LETTER_RATES;
      return { tariff: rates[zoneIndex], product: "envelope" as const };
    }
    const rates = currentDirection === "outbound" ? EXPORT_DOC_RATES : IMPORT_DOC_RATES;
    const tariff = firstRateAtOrAbove(DOC_WEIGHTS, rates, weight, zone);
    return tariff === null ? null : { tariff, product: "documents" as const };
  }

  if (weight <= 70) {
    const rates = currentDirection === "outbound" ? EXPORT_PACKAGE_RATES : IMPORT_PACKAGE_RATES;
    const tariff = firstRateAtOrAbove(PACKAGE_WEIGHTS, rates, weight, zone);
    return tariff === null ? null : { tariff, product: "package" as const };
  }

  const perKg = (currentDirection === "outbound" ? EXPORT_ABOVE_70_PER_KG : IMPORT_ABOVE_70_PER_KG)[zoneIndex];
  const minimum = (currentDirection === "outbound" ? EXPORT_ABOVE_70_MINIMUM : IMPORT_ABOVE_70_MINIMUM)[zoneIndex];
  const roundedWeight = Math.ceil(weight);
  return {
    tariff: round2(Math.max(minimum, roundedWeight * perKg)),
    product: "package-over-70" as const,
    roundedWeight,
    perKg,
    minimum,
  };
}

function discountFor(product: "envelope" | "documents" | "package" | "package-over-70", weight: number, zone: number) {
  const zoneIndex = zone - 1;
  if (product === "envelope") {
    return (currentDirection === "outbound" ? EXPORT_LETTER_DISCOUNTS : IMPORT_LETTER_DISCOUNTS)[zoneIndex];
  }
  if (product === "documents") {
    return (currentDirection === "outbound" ? EXPORT_DOC_DISCOUNTS : IMPORT_DOC_DISCOUNTS)[zoneIndex];
  }
  const matrix = currentDirection === "outbound" ? EXPORT_PACKAGE_DISCOUNTS : IMPORT_PACKAGE_DISCOUNTS;
  return matrix[zoneIndex][packageDiscountIndex(weight)];
}

function unavailable(result: UpsRuntimeResult, reason: string) {
  result.name = "UPS Express Saver";
  result.serviceType = "MBE Express";
  result.price = null;
  result.possible = false;
  result.status = "no";
  result.details = [UPS_MARKER, reason];
  result.warning = undefined;
}

function applyUpsRate(result: UpsRuntimeResult) {
  result.name = "UPS Express Saver";
  result.serviceType = "MBE Express";

  if (currentCountry === "AL") return;
  if (result.details.some((detail) => detail.startsWith(UPS_MARKER))) return;

  const albanian = isAlbanian();
  const zoneResolution = resolveZone();
  if (zoneResolution.ambiguous) {
    unavailable(
      result,
      albanian
        ? "Tabela UPS përmban më shumë se një zonë për këtë shtet. Kërkohet ofertë manuale."
        : "The UPS source table contains more than one zone for this country. A manual quote is required.",
    );
    return;
  }
  if (!zoneResolution.zone) {
    unavailable(
      result,
      albanian
        ? "UPS Express Saver nuk ka zonë të konfiguruar për këtë itinerar."
        : "UPS Express Saver has no configured zone for this route.",
    );
    return;
  }

  const weight = chargeableWeight(result);
  if (!weight) {
    unavailable(result, albanian ? "Vendosni peshën e dërgesës." : "Enter the shipment weight.");
    return;
  }

  const published = officialTariff(currentShipmentType, weight, zoneResolution.zone);
  if (!published) {
    unavailable(
      result,
      currentShipmentType === "documents"
        ? (albanian ? "Dokumentet UPS lejohen deri në 5 kg." : "UPS documents are available up to 5 kg.")
        : (albanian ? "Nuk u gjet tarifë UPS për këtë peshë." : "No UPS tariff was found for this weight."),
    );
    return;
  }

  const discount = discountFor(published.product, weight, zoneResolution.zone);
  const fuel = round2(published.tariff * UPS_FUEL_RATE);
  const beforeDiscount = round2(published.tariff + fuel);
  const discountAmount = round2(beforeDiscount * discount);
  const total = round2(beforeDiscount - discountAmount);

  const productLabel = published.product === "envelope"
    ? "UPS Express Envelope"
    : published.product === "documents"
      ? (albanian ? "Dokumente" : "Documents")
      : (albanian ? "Pako" : "Package");

  const details = albanian
    ? [
        `${UPS_MARKER} · ${currentDirection === "outbound" ? "Eksport" : "Import"}`,
        `Produkti: ${productLabel}`,
        `Zona: ${zoneResolution.zone}`,
        `Pesha e faturueshme: ${weight.toFixed(2)} kg`,
        `Tarifa zyrtare: ${euro(published.tariff)}`,
        `Karburanti ${(UPS_FUEL_RATE * 100).toFixed(2)}% (nga ${UPS_FUEL_EFFECTIVE}): ${euro(fuel)}`,
        `Nëntotali para zbritjes: ${euro(beforeDiscount)}`,
        `Zbritja ${(discount * 100).toFixed(2)}% mbi tarifën + karburantin: −${euro(discountAmount)}`,
        "Remote/extended area, dogana dhe shërbimet opsionale nuk përfshihen.",
      ]
    : [
        `${UPS_MARKER} · ${currentDirection === "outbound" ? "Export" : "Import"}`,
        `Product: ${productLabel}`,
        `Zone: ${zoneResolution.zone}`,
        `Chargeable weight: ${weight.toFixed(2)} kg`,
        `Official tariff: ${euro(published.tariff)}`,
        `Fuel ${(UPS_FUEL_RATE * 100).toFixed(2)}% (effective ${UPS_FUEL_EFFECTIVE}): ${euro(fuel)}`,
        `Subtotal before discount: ${euro(beforeDiscount)}`,
        `Discount ${(discount * 100).toFixed(2)}% on tariff + fuel: −${euro(discountAmount)}`,
        "Remote/extended area, customs and optional services are excluded.",
      ];

  if ("roundedWeight" in published) {
    details.splice(
      5,
      0,
      albanian
        ? `Mbi 70 kg: ${published.roundedWeight} kg × ${euro(published.perKg)}/kg; minimumi ${euro(published.minimum)}`
        : `Above 70 kg: ${published.roundedWeight} kg × ${euro(published.perKg)}/kg; minimum ${euro(published.minimum)}`,
    );
  }

  if (currentCountry === "ES") {
    details.push(
      zoneResolution.specialSpain
        ? (albanian ? "Kodi postar tregon Ishujt Kanarie, Ceuta ose Melilla: zona 8." : "The postal code indicates the Canary Islands, Ceuta or Melilla: zone 8.")
        : (albanian ? "Spanja standarde: zona 3. Ishujt Kanarie, Ceuta dhe Melilla janë zona 8." : "Standard Spain: zone 3. The Canary Islands, Ceuta and Melilla are zone 8."),
    );
  }

  result.price = total;
  result.possible = true;
  result.status = "ok";
  result.warning = undefined;
  result.details = details;
}

function applyUpsRates(results: UpsRuntimeResult[]) {
  const result = results.find((item) => item.name === "UPS Express" || item.name === "UPS Express Saver");
  if (result) applyUpsRate(result);
}

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement) currentCountry = target.value;
}, true);

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.id === "dhl-zip-code" && currentCountry === "ES") {
    const weightInput = document.querySelector<HTMLInputElement>('input[placeholder="kg"]');
    weightInput?.dispatchEvent(new Event("input", { bubbles: true }));
  }
}, true);

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const label = target.closest("button")?.textContent?.trim() ?? "";

  if (label.includes("Import") || label.includes("Hyrëse")) currentDirection = "inbound";
  if (label.includes("Export") || label.includes("Eksport") || label.includes("Dalëse")) currentDirection = "outbound";
  if (label.includes("Documents") || label.includes("Dokumente") || label.includes("Envelope") || label.includes("Zarf")) currentShipmentType = "documents";
  if (label === "Parcel" || label === "Pako" || label.includes("📦")) currentShipmentType = "parcel";
  if (label === "Reset" || label === "Rivendos") {
    currentDirection = "outbound";
    currentCountry = "AL";
    currentShipmentType = "parcel";
  }
}, true);

const previousFilter = Array.prototype.filter;
const upsFilter = function <T>(
  this: T[],
  callbackfn: (value: T, index: number, array: T[]) => unknown,
  thisArg?: unknown,
): T[] {
  if (this.some(isRuntimeResult)) applyUpsRates(this as unknown as UpsRuntimeResult[]);
  return previousFilter.call(this, callbackfn, thisArg);
};
Array.prototype.filter = upsFilter as typeof Array.prototype.filter;

function styleUpsBadges() {
  document.querySelectorAll<HTMLElement>("div").forEach((element) => {
    const text = element.textContent?.trim();
    if (text !== "UPS Express Saver") return;
    if (element.style.borderRadius !== "999px" && element.style.minHeight !== "34px") return;

    element.style.background = "#111111";
    element.style.color = "#d4af37";
    element.style.border = "1px solid #111111";
    element.style.textShadow = "none";
    element.style.boxShadow = "0 1px 2px rgba(15,23,42,.12)";
    element.style.fontWeight = "800";

    const duplicate = element.nextElementSibling;
    if (duplicate instanceof HTMLElement && duplicate.textContent?.trim() === text) {
      duplicate.style.display = "none";
    }
  });
}

new MutationObserver(styleUpsBadges).observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
});
queueMicrotask(styleUpsBadges);
