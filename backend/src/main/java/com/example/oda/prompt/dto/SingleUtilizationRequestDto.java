package com.example.oda.prompt.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SingleUtilizationRequestDto {
    private DataInfo dataInfo;
    private String analysisType;

    @Getter
    @Setter
    public static class DataInfo {
        private String fileName;
        // 필요한 경우 여기에 추가 필드를 정의할 수 있습니다 (예: title, category 등)
    }
}
