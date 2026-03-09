import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

export async function handleGetClassUsages(args: any) {
    try {
        if (!args?.class_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Class name is required');
        }

        const className = args.class_name.toUpperCase();
        const encodedClassName = encodeURIComponent(className);
        const baseUrl = await getBaseUrl();
        const url = `${baseUrl}/sap/bc/adt/repository/informationsystem/usageReferences?uri=%2Fsap%2Fbc%2Fadt%2Foo%2Fclasses%2F${encodedClassName}`;

        // XML payload for usage references request
        const xmlPayload = `<?xml version="1.0" encoding="ASCII"?>
<usagereferences:usageReferenceRequest xmlns:usagereferences="http://www.sap.com/adt/ris/usageReferences">
  <usagereferences:affectedObjects/>
  <usagereferences:scope localUsage="false">
    <usagereferences:objectIdentifier displayName="${className} (Class)" globalType="CLAS/OC"/>
    <usagereferences:grade definitions="false" elements="true" indirectReferences="false"/>
    <usagereferences:objectTypes>
      <usagereferences:type isDefault="true" isSelected="true" name="CLAS/OC"/>
      <usagereferences:type isDefault="true" isSelected="true" name="INTF/OI"/>
      <usagereferences:type isDefault="true" isSelected="true" name="PROG/1P"/>
      <usagereferences:type isDefault="true" isSelected="true" name="PROG/1F"/>
      <usagereferences:type isDefault="true" isSelected="true" name="PROG/1T"/>
      <usagereferences:type isDefault="false" isSelected="false" name="WDYN/YT"/>
      <usagereferences:type isDefault="false" isSelected="false" name="WAPA/WO"/>
      <usagereferences:type isDefault="false" isSelected="false" name="FUGR/FF"/>
      <usagereferences:type isDefault="false" isSelected="false" name="PINF/KI"/>
      <usagereferences:type isDefault="false" isSelected="false" name="TRAN/T"/>
      <usagereferences:type isDefault="false" isSelected="false" name="WEBI/3I"/>
      <usagereferences:type isDefault="false" isSelected="false" name="SXSD/XD"/>
      <usagereferences:type isDefault="false" isSelected="false" name="ENHO/XH"/>
      <usagereferences:type isDefault="false" isSelected="false" name="ENHS/XS"/>
      <usagereferences:type isDefault="false" isSelected="false" name="DTEL/DE"/>
      <usagereferences:type isDefault="false" isSelected="false" name="TABL/DS"/>
      <usagereferences:type isDefault="false" isSelected="false" name="TTYP/DA"/>
      <usagereferences:type isDefault="false" isSelected="false" name="SQSC/DU"/>
      <usagereferences:type isDefault="false" isSelected="false" name="DDLS/DF"/>
      <usagereferences:type isDefault="false" isSelected="false" name="ECAT/GE"/>
      <usagereferences:type isDefault="false" isSelected="false" name="AOBJ/TYP"/>
      <usagereferences:type isDefault="false" isSelected="false" name="BDEF/BDO"/>
      <usagereferences:type isDefault="false" isSelected="false" name="BOBF"/>
      <usagereferences:type isDefault="false" isSelected="false" name="BOBX"/>
      <usagereferences:type isDefault="false" isSelected="false" name="CHKO/TYP"/>
      <usagereferences:type isDefault="false" isSelected="false" name="CMHC"/>
      <usagereferences:type isDefault="false" isSelected="false" name="DDLX/EX"/>
      <usagereferences:type isDefault="false" isSelected="false" name="DMON"/>
      <usagereferences:type isDefault="false" isSelected="false" name="DRAS/RAS"/>
      <usagereferences:type isDefault="false" isSelected="false" name="DRTY/STY"/>
      <usagereferences:type isDefault="false" isSelected="false" name="DTSC/DF"/>
      <usagereferences:type isDefault="false" isSelected="false" name="EEEC/EVC"/>
      <usagereferences:type isDefault="false" isSelected="false" name="JOBD"/>
      <usagereferences:type isDefault="false" isSelected="false" name="PDWS"/>
      <usagereferences:type isDefault="false" isSelected="false" name="SAIA/TYP"/>
      <usagereferences:type isDefault="false" isSelected="false" name="SAMC"/>
      <usagereferences:type isDefault="false" isSelected="false" name="SAPC"/>
      <usagereferences:type isDefault="false" isSelected="false" name="SE61/DC"/>
      <usagereferences:type isDefault="false" isSelected="false" name="SKTD/TYP"/>
      <usagereferences:type isDefault="false" isSelected="false" name="SOD2"/>
      <usagereferences:type isDefault="false" isSelected="false" name="SRVC/SVM"/>
      <usagereferences:type isDefault="false" isSelected="false" name="SRVD/SRV"/>
      <usagereferences:type isDefault="false" isSelected="false" name="SVAL"/>
      <usagereferences:type isDefault="false" isSelected="false" name="WB2A/TYP"/>
      <usagereferences:type isDefault="false" isSelected="false" name="WB2J/TYP"/>
      <usagereferences:type isDefault="false" isSelected="false" name="WMPC"/>
    </usagereferences:objectTypes>
  </usagereferences:scope>
</usagereferences:usageReferenceRequest>`;

        const customHeaders = {
            'Content-Type': 'application/vnd.sap.adt.repository.usagereferences.request.v1+xml',
        };

        const response = await makeAdtRequest(url, 'POST', 30000, xmlPayload, undefined, customHeaders);
        return return_response(response);
    } catch (error) {
        return return_error(error);
    }
}
