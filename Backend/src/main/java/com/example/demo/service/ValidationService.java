package com.example.demo.service;

import com.example.demo.util.LogFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

/**
 * [역할: AI 이미지 검증 서비스]
 * - 프론트엔드에서 업로드한 전신 사진이 AI 서버에서 분석 가능한 형태인지 미리 검증합니다.
 */
@Service
public class ValidationService {
    private static final Logger log = LoggerFactory.getLogger(ValidationService.class);
    private final RestTemplate restTemplate;

    // AI MediaPipe 서버 통신용 URL (application.properties 참조)
    @Value("${ai.mediapipe.url}") private String aiMediaPipeUrl;

    public ValidationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * [기능: 이미지 유효성 검사]
     * - 파일 존재 여부를 체크하고, MediaPipe AI 서버로 전송하여 분석 가능 여부를 확인합니다.
     * @param file 검사할 전신 이미지 파일
     * @return 검증 결과 (status: success/error)
     */
    public Map<String, Object> validate(MultipartFile file) {
        // 1. 파일 기본 유효성 확인
        if (file == null || file.isEmpty()) {
            return Map.of("status", "error", "message", "파일이 없습니다.");
        }

        try {
            log.info(">>> [LOG] AI 서버로 검증 시작: {}", file.getOriginalFilename());

            // 2. HTTP 요청 헤더 및 멀티파트 본문 구성
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            // 파일 리소스 바인딩 (ByteArrayResource 활용)
            body.add("file", new ByteArrayResource(file.getBytes()) { 
                @Override public String getFilename() { return file.getOriginalFilename(); } 
            });
            
            // 검증용 더미 데이터 설정 (AI 서버 규격에 맞춤)
            body.add("user_id", "validation_check");
            body.add("height_cm", 175.0);
            body.add("gender", "MALE");

            // 3. MediaPipe AI 서버 호출
            restTemplate.postForEntity(aiMediaPipeUrl, new HttpEntity<>(body, headers), Map.class);
            
            log.info(">>> [LOG] AI 검증 성공!");
            return Map.of("status", "success");

        } catch (Exception e) {
            // 4. 통신 오류 또는 AI 분석 불가 시 예외 처리
            log.error(">>> [LOG] AI 검증 실패 (사유): {}", e.getMessage());
            return Map.of("status", "error");
        }
    }
}