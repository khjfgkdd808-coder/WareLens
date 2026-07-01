package com.example.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.*;
import java.util.*;

/**
 * [역할: 서비스 구현 - 핵심 비즈니스 로직 및 AI 서버 연동]
 * - 리액트의 clothingImages 데이터를 파이썬 FastAPI 스펙(style_images)에 맞게 변환하여 통신
 * - 기존 로컬 파일 백업 로직(D드라이브 저장)은 그대로 유지
 */
@Service
public class RecommendationService {

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Value("${ai.server.url}")
    private String aiServerUrl; // application.properties에서 주입 (http://localhost:8001/internal/clip/recommend)

    private final RestTemplate restTemplate;

    public RecommendationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Map<String, Object> processRecommendation(UploadRequestDto dto) throws Exception {
        
        // 1. [로컬 파일 백업] 의류 이미지 D 드라이브 저장 로직 (기존 코드 유지)
        if (dto.getClothingImages() != null) {
            for (MultipartFile img : dto.getClothingImages()) {
                if (!img.isEmpty()) {
                    Path path = Paths.get(uploadDir + "clothing_" + img.getOriginalFilename());
                    Files.createDirectories(path.getParent());
                    Files.copy(img.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);
                }
            }
        }

        // 2. [로컬 파일 백업] 전신 이미지 D 드라이브 저장 로직 (기존 코드 유지)
        if (dto.getFullBodyImage() != null && !dto.getFullBodyImage().isEmpty()) {
            MultipartFile bodyFile = dto.getFullBodyImage();
            Path path = Paths.get(uploadDir + "body_" + bodyFile.getOriginalFilename());
            Files.createDirectories(path.getParent());
            Files.copy(bodyFile.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);
        } else {
            throw new IllegalArgumentException("전신 사진(fullBodyImage)이 누락되었습니다.");
        }

        // 3. [FastAPI 전송용 바구니 구성] 파이썬 app.py의 'style_images' 스펙에 맞춤
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        // 파이썬 app.py는 'style_images'라는 단 하나의 Key로 여러 파일(List)을 받습니다.
        if (dto.getClothingImages() != null && !dto.getClothingImages().isEmpty()) {
            for (MultipartFile img : dto.getClothingImages()) {
                if (!img.isEmpty()) {
                    final String fileName = img.getOriginalFilename();
                    final byte[] bytes = img.getBytes();
                    
                    // ByteArrayResource를 사용해 파일명과 데이터를 바구니에 'style_images'라는 키로 누적 추가합니다.
                    body.add("style_images", new ByteArrayResource(bytes) {
                        @Override
                        public String getFilename() { return fileName; }
                    });
                }
            }
        } else {
            throw new IllegalArgumentException("추천을 위한 스타일 이미지(clothingImages)가 없습니다.");
        }

        // 4. [통신 및 반환] AI 서버 호출 및 응답 수신
        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(aiServerUrl, requestEntity, Map.class);

        return response.getBody();
    }
}