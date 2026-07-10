package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import java.util.*;

/**
 * [추천 서비스 컨트롤러]
 * - 프론트엔드의 요청을 받아 RecommendationService로 전달합니다.
 * - [데이터 표준화]: userInfo 내부 JSON Key를 'user_id', 'height_cm', 'gender'로 통일함.
 */
@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS})
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final RestTemplate restTemplate;

    public RecommendationController(RecommendationService recommendationService, RestTemplate restTemplate) { 
        this.recommendationService = recommendationService;
        this.restTemplate = restTemplate;
    }

    /** [기능: 파일 업로드 및 분석 시작] */
    @PostMapping("/upload")
    public Map<String, Object> uploadFile(@ModelAttribute UploadRequestDto requestDto) {
        try { 
            return recommendationService.processRecommendation(requestDto); 
        }
        catch (Exception e) { 
            return Map.of("status", "ERROR", "message", e.getMessage()); 
        }
    }

    /** [기능: 추천 결과 조회(쿼리)] */
    @GetMapping("")
    public Map<String, Object> getRecommendationsByQuery(@RequestParam("taskId") String taskId) {
        return recommendationService.getAnalysisResult(taskId);
    }

    /** [기능: 추천 결과 조회(경로)] */
    @GetMapping("/analysis/{taskId}")
    public Map<String, Object> getAnalysisResult(@PathVariable("taskId") String taskId) {
        return recommendationService.getAnalysisResult(taskId);
    }

    /** [기능: 체형 유효성 검증] */
    @PostMapping("/validate/body")
    public Map<String, Object> validateBody(@RequestParam("file") MultipartFile file) { 
        return recommendationService.validateBody(file); 
    }

    /** [기능: 신규 피팅 요청] */
    @PostMapping("/tryon")
    public Map<String, Object> requestNewTryOn(@RequestBody Map<String, Object> request) {
        try {
            String userId = (String) request.get("taskId");
            @SuppressWarnings("unchecked")
            Map<String, Object> garmentInfo = (Map<String, Object>) request.get("garment_info");
            
            // 임의 생성했던 executeTask 삭제, 서비스의 원본 메서드 호출
            return recommendationService.getOrCreateFitting(userId, garmentInfo);
        } catch (Exception e) {
            return Map.of("status", "ERROR", "message", e.getMessage());
        }
    }
    
    /** [기능: 결과 저장] */
    @PostMapping("/gallery/save-fitting")
    public Map<String, Object> saveFittingResult(
            @RequestParam("taskId") String taskId,
            @RequestParam("file") MultipartFile file) {
        try {
            recommendationService.saveFittingResultToFolder(taskId, file.getBytes(), file.getOriginalFilename());
            return Map.of("status", "SUCCESS");
        } catch (Exception e) {
            return Map.of("status", "ERROR", "message", e.getMessage());
        }
    }
}