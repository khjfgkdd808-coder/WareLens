package com.example.demo.util;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * [역할: 안전한 로그 포맷팅 유틸리티]
 * - 방대한 데이터나 민감한 필드(base64 등)가 포함된 객체를 로그로 출력할 때, 
 * 전체를 출력하지 않고 가독성을 높여주는 역할을 합니다.
 */
public class LogFormatter {
    
    // JSON 직렬화/역직렬화를 위한 공통 Mapper
    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * [기능: 안전한 JSON 문자열 반환]
     * - 객체를 JSON 문자열로 변환하고, 특정 키(keys)에 해당하는 값은 앞부분 50자만 남기고 생략(...) 처리합니다.
     * * @param obj  JSON으로 변환할 객체 또는 문자열
     * @param keys 마스킹(일부 생략) 처리할 필드명들
     * @return 마스킹 처리된 JSON 문자열 (실패 시 "JSON 변환 실패")
     */
    public static String getSafeJson(Object obj, String... keys) {
        try {
            // 입력값이 문자열이면 그대로, 객체면 JSON으로 변환
            String json = (obj instanceof String) ? (String) obj : objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(obj);
            
            // 지정된 키값들에 대해 정규식 기반으로 50자 이후 내용을 생략 처리
            for (String key : keys) {
                // key에 해당하는 값의 앞부분 50자만 보존하고 나머지를 '...'로 대체
                json = json.replaceAll("(\"" + key + "\"\\s*:\\s*\")([^\"]{50})([^\"]*)(\")", "$1$2...$4");
            }
            return json;
        } catch (Exception e) { 
            return "JSON 변환 실패"; 
        }
    }
}